
import React, { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { useChatHistory, ChatSession } from "@/hooks/useChatHistory";
import { useAuth } from "@/hooks/useAuth";
import { isToday, isYesterday, subDays, isAfter, startOfDay } from "date-fns";
import SettingsDialog from "@/components/SettingsDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MessageSquare,
  Eye,
  ImageIcon,
  BookOpen,
  PanelLeftClose,
  PanelLeft,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Settings,
  FileUp,
  Mic,
  LogOut,
} from "lucide-react";

const navItems = [
  { to: "/vision", icon: Eye, label: "Vision" },
  { to: "/image-url", icon: ImageIcon, label: "Image URL" },
  { to: "/file-upload", icon: FileUp, label: "File Upload" },
  { to: "/voice", icon: Mic, label: "Voice" },
  { to: "/api-docs", icon: BookOpen, label: "API Docs" },
];

const DashboardLayout = () => {
  // On mobile sidebar starts closed; on desktop it starts open
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { theme } = useTheme();
  const chatHistory = useChatHistory();
  const navigate = useNavigate();
  const location = useLocation();
  const isChatRoute = location.pathname === "/" || location.pathname.startsWith("/chat/");
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/signin", { replace: true });
  };

  const handleNewChat = () => {
    const id = chatHistory.createSession();
    navigate(`/chat/${id}`);
  };

  const startRename = (id: string, title: string) => {
    setEditingId(id);
    setEditTitle(title);
  };

  const confirmRename = () => {
    if (editingId && editTitle.trim()) {
      chatHistory.renameSession(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  // Close sidebar when navigating on mobile
  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768) setCollapsed(true);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Mobile backdrop */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Sidebar — overlay drawer on mobile, inline on desktop */}
      <aside
        className={cn(
          "flex flex-col bg-sidebar shrink-0 transition-all duration-300 ease-in-out",
          // Mobile: fixed overlay, slide in/out
          "fixed inset-y-0 left-0 z-50 w-[260px]",
          "md:relative md:z-auto md:inset-auto",
          // Mobile visibility via translate
          collapsed ? "-translate-x-full md:translate-x-0" : "translate-x-0",
          // Desktop: collapse via width
          collapsed ? "md:w-0 md:overflow-hidden" : "md:w-[260px]"
        )}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between h-12 px-3 shrink-0">
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Close sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
          <button
            onClick={handleNewChat}
            className="p-1.5 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="New chat"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="px-2 space-y-0.5">
          <button
            onClick={() => {
              chatHistory.setActiveId(null);
              navigate("/");
              closeSidebarOnMobile();
            }}
            className={cn(
              "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] transition-colors",
              isChatRoute
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <MessageSquare size={16} />
            <span>Chat</span>
          </button>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeSidebarOnMobile}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )
              }
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Chat history */}
        {(chatHistory.sessions || []).length > 0 && (() => {
          const sessions = chatHistory.sessions;
          const groups: { label: string; items: ChatSession[] }[] = [
            { label: "Today", items: [] },
            { label: "Yesterday", items: [] },
            { label: "Previous 7 Days", items: [] },
            { label: "Older", items: [] },
          ];

          const today = startOfDay(new Date());
          const yesterday = startOfDay(subDays(new Date(), 1));
          const sevenDaysAgo = startOfDay(subDays(new Date(), 7));

          sessions.forEach((s) => {
            const date = new Date(s.updatedAt || s.createdAt);
            if (isToday(date)) groups[0].items.push(s);
            else if (isYesterday(date)) groups[1].items.push(s);
            else if (isAfter(date, sevenDaysAgo)) groups[2].items.push(s);
            else groups[3].items.push(s);
          });

          return (
            <div className="mt-4 px-2 flex-1 overflow-y-auto custom-scrollbar">
              {groups.map((group) => group.items.length > 0 && (
                <div key={group.label} className="mb-4 last:mb-0">
                  <p className="text-[10px] font-semibold text-sidebar-foreground/30 uppercase tracking-[0.05em] px-3 mb-2">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((session) => (
                      <div
                        key={session.id}
                        className={cn(
                          "group flex items-center gap-1 px-3 py-2 rounded-lg text-[13px] cursor-pointer transition-all duration-200",
                          chatHistory.activeId === session.id
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        {editingId === session.id ? (
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            <input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && confirmRename()}
                              className="flex-1 min-w-0 bg-transparent text-[13px] outline-none border-b border-sidebar-foreground/30"
                              autoFocus
                            />
                            <button onClick={confirmRename} className="p-0.5 hover:text-primary">
                              <Check size={12} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-0.5">
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                chatHistory.setActiveId(session.id);
                                navigate(`/chat/${session.id}`);
                                closeSidebarOnMobile();
                              }}
                              className="flex-1 min-w-0 truncate text-left"
                            >
                              {session.title}
                            </button>
                            <div className="hidden group-hover:flex items-center gap-0.5 shrink-0 animate-in fade-in duration-200">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startRename(session.id, session.title);
                                }}
                                className="p-0.5 rounded hover:text-primary transition-colors"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget({ id: session.id, title: session.title });
                                }}
                                className="p-0.5 rounded hover:text-destructive transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Bottom: user + Settings + Logout */}
        <div className="p-3 border-t border-sidebar-border shrink-0 space-y-0.5">
          {user && (
            <p className="px-3 py-1 text-[11px] text-sidebar-foreground/40 truncate" title={user.username}>
              {user.username}
            </p>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <Settings size={16} />
            <span>Settings</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive transition-colors"
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {collapsed && (
          <div className="flex items-center h-12 px-3 shrink-0">
            <button
              onClick={() => setCollapsed(false)}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary transition-colors"
              aria-label="Open sidebar"
            >
              <PanelLeft size={18} />
            </button>
            <button
              onClick={handleNewChat}
              className="ml-2 p-1.5 rounded-md text-muted-foreground hover:bg-secondary transition-colors"
              aria-label="New chat"
            >
              <Plus size={18} />
            </button>
          </div>
        )}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <Outlet />
        </main>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-sm rounded-2xl bg-card border-border/50 shadow-2xl p-6 gap-5">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="font-display text-lg text-foreground">Delete chat?</AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] text-muted-foreground leading-relaxed">
              This will delete <strong className="text-foreground font-semibold">{deleteTarget?.title}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-1">
            <AlertDialogCancel className="rounded-full px-5 border-border/50 text-[13px] hover:bg-secondary">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full px-5 text-[13px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  const wasActive = chatHistory.activeId === deleteTarget.id;
                  chatHistory.deleteSession(deleteTarget.id);
                  if (wasActive) navigate("/");
                }
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Settings dialog */}
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </div>
  );
};

export default DashboardLayout;
