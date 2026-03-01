import { MainAppSidebar } from "@/src/components/sidebar/main-app-sidebar";
import { use } from "react";

export default function Layout(props: {
  children: React.ReactNode;
  params: Promise<{ orgId?: string; projectId?: string }>;
}) {
  const { children, params } = props;
  const { orgId, projectId } = use(params);

  return (
    <>
      <MainAppSidebar orgId={orgId} projectId={projectId} />
      <main className="flex-1">{children}</main>
    </>
  );
}
