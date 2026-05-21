import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  BarChart3,
  Megaphone,
  Plug,
  LogOut,
  Menu,
  Settings,
  User,
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Bot,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Stethoscope,
  FileText,
  Zap,
  MessageSquare,
  Sun,
  Moon,
  Users,
  Target,
  Workflow,
  Link2,
  MessageSquareText,
  QrCode,
  Webhook,
  type LucideIcon,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

const notificationIcons: Record<string, typeof Info> = {
  INFO: Info,
  WARNING: AlertTriangle,
  SUCCESS: CheckCircle2,
  ERROR: AlertCircle,
};

const notificationColors: Record<string, string> = {
  INFO: 'text-blue-500',
  WARNING: 'text-orange-500',
  SUCCESS: 'text-green-500',
  ERROR: 'text-red-500',
};

type NavLeaf = { name: string; href: string; icon: LucideIcon };
type NavGroup = { name: string; icon: LucideIcon; items: NavLeaf[] };
type NavEntry = NavLeaf | NavGroup;

const isGroup = (entry: NavEntry): entry is NavGroup => 'items' in entry;

const navItems: NavEntry[] = [
  { name: 'Painel', href: '/dashboard', icon: BarChart3 },
  { name: 'Campanhas', href: '/campaigns', icon: Megaphone },
  { name: 'Plataformas', href: '/platforms', icon: Plug },
  {
    name: 'Vendas',
    icon: MessageSquare,
    items: [
      { name: 'WhatsApp', href: '/whatsapp', icon: MessageSquare },
      { name: 'Leads', href: '/leads', icon: Target },
      { name: 'Clientes', href: '/clients', icon: Users },
    ],
  },
  {
    name: 'Rastreamento',
    icon: Workflow,
    items: [
      { name: 'Jornada de Compra', href: '/purchase-journey', icon: Workflow },
      { name: 'Links Rastreáveis', href: '/tracking-links', icon: Link2 },
      { name: 'Msg Rastreáveis', href: '/tracking-messages', icon: MessageSquareText },
      { name: 'Eventos de Conversão', href: '/conversion-events', icon: Zap },
      { name: 'Pixel', href: '/pixel', icon: QrCode },
      { name: 'Webhooks', href: '/webhooks', icon: Webhook },
    ],
  },
  {
    name: 'Inteligência',
    icon: Bot,
    items: [
      { name: 'Agente IA', href: '/ai-agent', icon: Bot },
      { name: 'Automação', href: '/automation', icon: Zap },
      { name: 'Diagnósticos', href: '/diagnostics', icon: Stethoscope },
    ],
  },
  { name: 'Relatórios', href: '/reports', icon: FileText },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Painel',
  '/campaigns': 'Campanhas',
  '/platforms': 'Plataformas',
  '/ai-agent': 'Agente IA',
  '/automation': 'Automação',
  '/diagnostics': 'Diagnósticos',
  '/reports': 'Relatórios',
  '/whatsapp': 'WhatsApp',
  '/clients': 'Clientes',
  '/leads': 'Leads',
  '/purchase-journey': 'Jornada de Compra',
  '/tracking-links': 'Links Rastreáveis',
  '/tracking-messages': 'Mensagens Rastreáveis',
  '/conversion-events': 'Eventos de Conversão',
  '/pixel': 'Pixel',
  '/webhooks': 'Webhooks',
};

function formatTimeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function NavLeafButton({
  item,
  collapsed,
  nested,
  onNavigate,
}: {
  item: NavLeaf;
  collapsed?: boolean;
  nested?: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const active = location.pathname === item.href;
  const Icon = item.icon;
  return (
    <Link to={item.href} onClick={onNavigate}>
      <Button
        variant="ghost"
        title={collapsed ? item.name : undefined}
        className={cn(
          'w-full justify-start font-normal',
          collapsed && 'justify-center px-2',
          nested && 'h-9 text-sm',
          active && 'bg-primary/10 text-primary hover:bg-primary/15 font-medium'
        )}
      >
        <Icon className={cn('h-5 w-5 shrink-0', nested && 'h-4 w-4')} />
        {!collapsed && <span className={cn('ml-3', nested && 'ml-2.5')}>{item.name}</span>}
      </Button>
    </Link>
  );
}

function NavGroupItem({
  group,
  onNavigate,
}: {
  group: NavGroup;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const hasActiveChild = group.items.some((i) => location.pathname === i.href);
  const [open, setOpen] = useState(hasActiveChild);

  useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  const Icon = group.icon;
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start font-normal',
            hasActiveChild && !open && 'text-primary'
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
          <span className="ml-3 flex-1 text-left">{group.name}</span>
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 space-y-1 border-l border-border/60 pl-2 ml-4">
        {group.items.map((item) => (
          <NavLeafButton key={item.href} item={item} nested onNavigate={onNavigate} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function SidebarNav({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  // Collapsed (icon-only) sidebar: flatten everything into icons.
  if (collapsed) {
    const leaves = navItems.flatMap((entry) =>
      isGroup(entry) ? entry.items : [entry]
    );
    return (
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {leaves.map((item) => (
          <NavLeafButton key={item.href} item={item} collapsed />
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {navItems.map((entry) =>
        isGroup(entry) ? (
          <NavGroupItem key={entry.name} group={entry} onNavigate={onNavigate} />
        ) : (
          <NavLeafButton key={entry.href} item={entry} onNavigate={onNavigate} />
        )
      )}
    </nav>
  );
}

export default function AppLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('creative-ads-dark-mode') === 'true';
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('creative-ads-dark-mode', String(darkMode));
  }, [darkMode]);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/api/notifications');
      return res.data.data;
    },
    refetchInterval: 30000,
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post('/api/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markOneRead = useMutation({
    mutationFn: (id: string) => api.patch(`/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifData?.unreadCount || 0;
  const notifications = notifData?.notifications || [];

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const SidebarBrand = ({ collapsed }: { collapsed?: boolean }) => (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
        <BarChart3 className="h-5 w-5 text-primary-foreground" />
      </div>
      {!collapsed && <h1 className="text-xl font-bold tracking-tight">HackrAds</h1>}
    </div>
  );

  const UserCard = () => (
    <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent">
      <Avatar className="h-9 w-9">
        <AvatarImage src={user?.avatar} />
        <AvatarFallback className="bg-primary text-primary-foreground">
          {getUserInitials()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user?.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
      </div>
    </div>
  );

  const DarkModeButton = ({ collapsed }: { collapsed?: boolean }) =>
    collapsed ? (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setDarkMode(!darkMode)}
        title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
      >
        {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    ) : (
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-muted-foreground"
        onClick={() => setDarkMode(!darkMode)}
      >
        {darkMode ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
        {darkMode ? 'Modo Claro' : 'Modo Escuro'}
      </Button>
    );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 hidden flex-col border-r bg-card transition-all duration-300 lg:flex',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          {sidebarOpen ? (
            <SidebarBrand />
          ) : (
            <div className="mx-auto">
              <SidebarBrand collapsed />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(!sidebarOpen && 'hidden')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <SidebarNav collapsed={!sidebarOpen} />

        {!sidebarOpen && (
          <div className="border-t p-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="w-full"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="border-t">
          {sidebarOpen ? (
            <div className="px-3 pt-2">
              <DarkModeButton />
            </div>
          ) : (
            <div className="flex justify-center p-2">
              <DarkModeButton collapsed />
            </div>
          )}
          {sidebarOpen && (
            <div className="px-3 pb-3 pt-1">
              <UserCard />
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-card transition-transform duration-300 lg:hidden',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b px-4">
            <SidebarBrand />
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />

          <div className="space-y-2 border-t p-3">
            <DarkModeButton />
            <UserCard />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={cn(
          'transition-all duration-300',
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card/80 px-4 backdrop-blur lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1">
            <h2 className="text-lg font-semibold">
              {pageTitles[location.pathname] || 'Painel'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            <Popover open={notifOpen} onOpenChange={setNotifOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-xs"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <h3 className="text-sm font-semibold">Notificações</h3>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto px-2 py-1 text-xs"
                      onClick={() => markAllRead.mutate()}
                    >
                      <CheckCheck className="mr-1 h-3 w-3" />
                      Marcar todas como lidas
                    </Button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Nenhuma notificação
                    </div>
                  ) : (
                    notifications.slice(0, 20).map((notif: any) => {
                      const IconComponent = notificationIcons[notif.type] || Info;
                      const colorClass = notificationColors[notif.type] || 'text-blue-500';
                      return (
                        <div
                          key={notif.id}
                          className={cn(
                            'flex cursor-pointer items-start gap-3 border-b px-4 py-3 transition-colors last:border-0 hover:bg-muted/50',
                            !notif.isRead && 'bg-primary/5'
                          )}
                          onClick={() => {
                            if (!notif.isRead) {
                              markOneRead.mutate(notif.id);
                            }
                            if (notif.metadata?.campaignId) {
                              setNotifOpen(false);
                              navigate(
                                `/diagnostics?campaignId=${notif.metadata.campaignId}&alert=${encodeURIComponent(notif.title)}`
                              );
                            }
                          }}
                        >
                          <IconComponent
                            className={cn('mt-0.5 h-4 w-4 flex-shrink-0', colorClass)}
                          />
                          <div className="min-w-0 flex-1">
                            <p className={cn('text-sm', !notif.isRead && 'font-medium')}>
                              {notif.title}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {notif.message}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatTimeAgo(notif.createdAt)}
                            </p>
                          </div>
                          {!notif.isRead && (
                            <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm md:inline-block">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
