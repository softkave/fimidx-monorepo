import { ProjectHeader } from "./project-header";

export interface IProjectPageProps {
  children: React.ReactNode;
}

export function ProjectPage(props: IProjectPageProps) {
  return (
    <div className="flex flex-col">
      <ProjectHeader showSidebarTrigger={true} />
      <div>{props.children}</div>
    </div>
  );
}
