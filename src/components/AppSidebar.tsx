import { Lightbulb, BarChart3, Database } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Insights", url: "/", icon: Lightbulb },
  { title: "Analysis", url: "/analysis", icon: BarChart3 },
  { title: "Data", url: "/data", icon: Database },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r-2 border-sidebar-border">
      <SidebarHeader className="px-4 py-5">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center border-2 border-foreground rounded-md">
              <span className="text-xs font-bold text-foreground">PF</span>
            </div>
            <div>
              <h1 className="text-xs font-bold tracking-wide text-sidebar-accent-foreground">Product Feedback</h1>
              <p className="text-[9px] tracking-wider text-muted-foreground">Cloudflare Intel</p>
            </div>
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center border-2 border-foreground rounded-md mx-auto">
            <span className="text-xs font-bold text-foreground">PF</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent text-sm"
                      activeClassName="bg-foreground text-background font-bold"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
