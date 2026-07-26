export interface ISidebarItem {
  title: string;
  url: string;
  icon: React.ElementType;
  /**
   * How to decide if this item is the current section.
   * - `prefix` (default): active for the url and any nested path
   * - `exact`: active only on the url itself (use for parents like Orgs/Projects
   *   that share a path prefix with deeper sections)
   */
  match?: "exact" | "prefix";
}
