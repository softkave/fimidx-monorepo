import { kFeatureListItems, WebFeatureList } from "./web-feature-list";
import { WebFooter } from "./web-footer";
import { WebHeader } from "./web-header";
import { WebLanding } from "./web-landing";
import { kResourceListItems, WebResourceList } from "./web-resource-list";

export function WebMain() {
  return (
    <main className="flex flex-col gap-12 w-full">
      <WebHeader className="p-6 md:p-8 py-4 md:py-4" />
      <WebLanding className="p-6 md:p-8" />
      <WebFeatureList items={kFeatureListItems} className="p-6 md:p-8" />
      <WebResourceList items={kResourceListItems} className="p-6 md:p-8" />
      <WebFooter className="p-6 pb-4 md:p-8 md:pb-4" />
    </main>
  );
}
