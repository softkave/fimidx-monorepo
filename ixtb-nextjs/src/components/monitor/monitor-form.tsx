"use client";

import {
  addMonitor,
  previewMonitor,
  runMonitorNow,
  updateMonitors,
} from "@/src/lib/clientApi/monitor";
import { kClientPaths } from "@/src/lib/clientHelpers/clientPaths";
import { getMsFromDuration } from "fimidx-core/common/date";
import { extractMonitorFilters } from "fimidx-core/common/monitor";
import {
  IMonitor,
  kMonitorResourceTypes,
  kMonitorStatus,
  kMonitorTimeFields,
  type MonitorTimeField,
} from "fimidx-core/definitions/monitor";
import type { IObjRecordQueryList } from "fimidx-core/definitions/obj";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/src/lib/clientHooks/useRouter";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { z } from "zod";
import { LogsFilterListContainer } from "../log/filter/logs-filter-list-container";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { DatePicker } from "../ui/date-picker";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { kApiMonitorKeys } from "@/src/lib/clientApi/apikeys";
import { MonitorReportsToUsersCombobox } from "./monitor-reports-to-users-combobox";

function durationToMinutes(duration: { minutes?: number } | undefined): number {
  if (!duration) return 10;
  try {
    return Math.max(5, Math.round(getMsFromDuration(duration as never) / 60_000));
  } catch {
    return duration.minutes ?? 10;
  }
}

function reportsToUserIds(
  reportsTo: IMonitor["reportsTo"] | undefined
): string[] {
  if (!reportsTo?.length) return [];
  return reportsTo
    .filter((r) => r.type === "user")
    .map((r) => r.userId);
}

const monitorFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  timeField: z.enum([
    kMonitorTimeFields.createdAt,
    kMonitorTimeFields.timestamp,
  ]),
  intervalMinutes: z.coerce.number().int().min(5, "Minimum interval is 5 minutes"),
  cooldownMinutes: z.coerce.number().int().min(0),
  alertOnThreshold: z.boolean(),
  alertIfCountGreaterThan: z.coerce.number().int().min(0).optional().nullable(),
  reportsToUserIds: z.array(z.string().min(1)).optional(),
  enabled: z.boolean(),
  muted: z.boolean(),
  snoozedUntil: z.string().optional().nullable(),
});

export type MonitorFormValues = z.infer<typeof monitorFormSchema>;

export interface IMonitorFormProps {
  orgId: string;
  projectId: string;
  monitor?: IMonitor;
  initialFilters?: IObjRecordQueryList;
  onSubmitComplete?: (monitor?: IMonitor) => void;
}

export function MonitorForm(props: IMonitorFormProps) {
  const { orgId, projectId, monitor, initialFilters, onSubmitComplete } = props;
  const router = useRouter();
  const isEdit = !!monitor;

  const defaultFilters = useMemo(() => {
    if (monitor) return extractMonitorFilters(monitor.query);
    return initialFilters ?? [];
  }, [monitor, initialFilters]);

  const [filters, setFilters] = useState<IObjRecordQueryList>(defaultFilters);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<{
    matchCount: number;
    windowStart?: string;
    windowEnd?: string;
  } | null>(null);

  const form = useForm<MonitorFormValues>({
    resolver: zodResolver(monitorFormSchema),
    defaultValues: {
      name: monitor?.name ?? "",
      description: monitor?.description ?? "",
      timeField: monitor?.timeField ?? kMonitorTimeFields.createdAt,
      intervalMinutes: durationToMinutes(monitor?.interval),
      cooldownMinutes: durationToMinutes(
        monitor?.cooldown ?? monitor?.interval ?? { minutes: 10 }
      ),
      alertOnThreshold: monitor?.alertIfCountGreaterThan != null,
      alertIfCountGreaterThan: monitor?.alertIfCountGreaterThan ?? null,
      reportsToUserIds: reportsToUserIds(monitor?.reportsTo),
      enabled: monitor ? monitor.status === kMonitorStatus.enabled : true,
      muted: monitor?.muted ?? false,
      snoozedUntil: monitor?.snoozedUntil
        ? new Date(monitor.snoozedUntil).toISOString()
        : null,
    },
  });

  const alertOnThreshold = form.watch("alertOnThreshold");

  const revalidateMonitors = useCallback(async () => {
    await mutate(
      (key) =>
        Array.isArray(key) &&
        typeof key[0] === "string" &&
        key[0].startsWith(kApiMonitorKeys.getMonitors()),
      undefined,
      { revalidate: true }
    );
  }, []);

  const buildPayload = useCallback(
    (values: MonitorFormValues) => {
      const reportsTo = (values.reportsToUserIds ?? []).filter(Boolean);

      return {
        name: values.name,
        description: values.description || undefined,
        query: {
          recordQuery: filters.length > 0 ? filters : undefined,
        },
        status: values.enabled
          ? kMonitorStatus.enabled
          : kMonitorStatus.disabled,
        reportsTo,
        interval: { minutes: values.intervalMinutes },
        resourceType: kMonitorResourceTypes.logs,
        timeField: values.timeField as MonitorTimeField,
        alertIfCountGreaterThan: values.alertOnThreshold
          ? (values.alertIfCountGreaterThan ?? 0)
          : null,
        cooldown: { minutes: values.cooldownMinutes },
        muted: values.muted,
        snoozedUntil: values.snoozedUntil
          ? new Date(values.snoozedUntil)
          : null,
      };
    },
    [filters]
  );

  const onSubmit = useCallback(
    async (values: MonitorFormValues) => {
      setIsSubmitting(true);
      try {
        const payload = buildPayload(values);
        if (isEdit && monitor) {
          await updateMonitors(monitor.id, {
            query: {
              projectId,
              id: { eq: monitor.id },
            },
            update: payload,
          });
          toast.success("Monitor updated");
          await revalidateMonitors();
          onSubmitComplete?.(monitor);
        } else {
          const result = await addMonitor({
            projectId,
            ...payload,
          });
          toast.success("Monitor created");
          await revalidateMonitors();
          onSubmitComplete?.(result.monitor);
          router.push(
            kClientPaths.app.org.project.monitors.single(
              orgId,
              projectId,
              result.monitor.id
            )
          );
        }
      } catch (error) {
        toast.error(
          isEdit ? "Failed to update monitor" : "Failed to create monitor",
          {
            description:
              error instanceof Error ? error.message : "An error occurred",
          }
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      buildPayload,
      isEdit,
      monitor,
      onSubmitComplete,
      orgId,
      projectId,
      revalidateMonitors,
      router,
    ]
  );

  const handleRunNow = useCallback(async () => {
    if (!monitor) return;
    setIsRunning(true);
    try {
      const result = await runMonitorNow(monitor.id);
      if (result.error) {
        toast.error(result.error);
      } else if (result.skipped) {
        toast.message(
          result.suppressedReason
            ? `Skipped: ${result.suppressedReason}`
            : "Run skipped"
        );
      } else if (result.alertCreated) {
        toast.success(
          `Alert created (${result.matchCount} match${result.matchCount === 1 ? "" : "es"})`
        );
      } else {
        toast.success(
          `Run finished — ${result.matchCount} match${result.matchCount === 1 ? "" : "es"}`
        );
      }
      await revalidateMonitors();
    } catch {
      // toasted
    } finally {
      setIsRunning(false);
    }
  }, [monitor, revalidateMonitors]);

  const handlePreview = useCallback(async () => {
    if (!monitor) return;
    setIsPreviewing(true);
    setPreviewResult(null);
    try {
      const result = (await previewMonitor(monitor.id)) as {
        matchCount?: number;
        windowStart?: string | Date;
        windowEnd?: string | Date;
      };
      setPreviewResult({
        matchCount: result.matchCount ?? 0,
        windowStart: result.windowStart
          ? new Date(result.windowStart).toLocaleString()
          : undefined,
        windowEnd: result.windowEnd
          ? new Date(result.windowEnd).toLocaleString()
          : undefined,
      });
      toast.success(
        `${result.matchCount ?? 0} matching ${(result.matchCount ?? 0) === 1 ? "entry" : "entries"}`
      );
    } catch {
      // toasted
    } finally {
      setIsPreviewing(false);
    }
  }, [monitor]);

  return (
    <Form {...form}>
      <form
        onSubmit={(evt) => {
          evt.stopPropagation();
          form.handleSubmit(onSubmit)(evt);
        }}
        className="space-y-8"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="High error rate" {...field} />
              </FormControl>
              <FormDescription>What should this monitor be called?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Alert when error logs spike"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Optional context shown in alerts and emails.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>Resource type</FormLabel>
          <Select disabled value={kMonitorResourceTypes.logs}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={kMonitorResourceTypes.logs}>Logs</SelectItem>
            </SelectContent>
          </Select>
          <FormDescription>
            Monitors currently watch log entries only.
          </FormDescription>
        </FormItem>

        <FormField
          control={form.control}
          name="timeField"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Time field</FormLabel>
              <FormControl>
                <ToggleGroup
                  variant="outline"
                  value={[field.value]}
                  onValueChange={(value) => {
                    if (value[0]) field.onChange(value[0]);
                  }}
                  className="w-full flex-col sm:flex-row"
                >
                  <ToggleGroupItem
                    value={kMonitorTimeFields.createdAt}
                    className="w-full justify-start px-3 py-6 h-auto"
                  >
                    <div className="flex flex-col items-start gap-0.5 text-left">
                      <span>Ingestion time</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        When the log was received (createdAt)
                      </span>
                    </div>
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value={kMonitorTimeFields.timestamp}
                    className="w-full justify-start px-3 py-6 h-auto"
                  >
                    <div className="flex flex-col items-start gap-0.5 text-left">
                      <span>Log event time</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        The timestamp on the log itself
                      </span>
                    </div>
                  </ToggleGroupItem>
                </ToggleGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>Filters</FormLabel>
          <LogsFilterListContainer
            orgId={orgId}
            projectId={projectId}
            filters={filters}
            onChange={setFilters}
            autoApply
          />
          <FormDescription>
            Only matching log entries are counted in each interval. Filters are
            saved when you save the monitor.
          </FormDescription>
        </FormItem>

        <FormField
          control={form.control}
          name="intervalMinutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Interval (minutes)</FormLabel>
              <FormControl>
                <Input type="number" min={5} {...field} />
              </FormControl>
              <FormDescription>
                How often to evaluate. Minimum 5 minutes.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cooldownMinutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cooldown (minutes)</FormLabel>
              <FormControl>
                <Input type="number" min={0} {...field} />
              </FormControl>
              <FormDescription>
                Wait this long after an alert before alerting again. Defaults to
                the interval.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="alertOnThreshold"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(!!checked)}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Alert only if count greater than N</FormLabel>
                <FormDescription>
                  {field.value
                    ? "Only alert when matches exceed the threshold."
                    : "Unchecked: alert on any matching entry."}
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {alertOnThreshold ? (
          <FormField
            control={form.control}
            name="alertIfCountGreaterThan"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Threshold (N)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    value={field.value ?? 0}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                  />
                </FormControl>
                <FormDescription>
                  Alert when match count is greater than this number.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <FormField
          control={form.control}
          name="reportsToUserIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notify</FormLabel>
              <FormControl>
                <MonitorReportsToUsersCombobox
                  orgId={orgId}
                  value={field.value ?? []}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormDescription>
                Org members to notify when this monitor alerts.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
              <div className="space-y-0.5">
                <FormLabel>Enabled</FormLabel>
                <FormDescription>
                  Disabled monitors are not evaluated.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="muted"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
              <div className="space-y-0.5">
                <FormLabel>Muted</FormLabel>
                <FormDescription>
                  Muted monitors still run but will not notify.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="snoozedUntil"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Snoozed until</FormLabel>
              <FormControl>
                <DatePicker
                  date={field.value}
                  setDate={(date) => field.onChange(date ?? null)}
                  className="w-full"
                />
              </FormControl>
              <FormDescription>
                Optionally snooze notifications until a date.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {isEdit ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isRunning}
                onClick={handleRunNow}
              >
                {isRunning ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Run now
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPreviewing}
                onClick={handlePreview}
              >
                {isPreviewing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Preview matches
              </Button>
            </div>
            {previewResult ? (
              <p className="text-sm text-muted-foreground">
                {previewResult.matchCount} match
                {previewResult.matchCount === 1 ? "" : "es"}
                {previewResult.windowStart && previewResult.windowEnd
                  ? ` in window ${previewResult.windowStart} → ${previewResult.windowEnd}`
                  : ""}
              </p>
            ) : null}
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : null}
          {isEdit ? "Update Monitor" : "Create Monitor"}
        </Button>
      </form>
    </Form>
  );
}
