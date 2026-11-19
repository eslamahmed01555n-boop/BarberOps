import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Coffee,
  Home as HomeIcon,
  ListChecks,
  Loader2,
  Menu,
  Plus,
  RefreshCw,
  Scissors,
  TimerReset,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

type Booking = {
  id: string;
  customerName: string;
  phone: string;
  service: string;
  duration: number;
  barberId: string;
  chair: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: "reserved" | "arrived" | "in_progress" | "delayed" | "completed" | "no_show" | "canceled";
  source: "whatsapp" | "phone" | "walk_in" | "reception";
  isConfirmed: boolean;
  actualArrival?: string;
  actualStart?: string;
  actualEnd?: string;
  expectedEnd?: string;
  addedServices: string[];
  note?: string;
};

type Barber = { id: string; name: string; initials: string; chair: string; status: string; specialty: string };
type Dashboard = { now: string; dateLabel: string; stats: { todayBookings: number; activeServices: number; waiting: number; attention: number }; barbers: Barber[]; bookings: Booking[]; queue: Array<{ id: string; customerName: string; phone: string; service: string; barberPreference?: string; arrivedAt: string; estimatedWait: number; source: "walk_in" }>; alerts: Array<{ id: string; severity: "critical" | "warning" | "info"; title: string; detail: string; bookingId?: string; queueId?: string; actionLabel?: string }>; events: Array<{ id: string; label: string; detail: string; at: string; actor: string; tone: string }> };

const statusMeta: Record<string, { label: string; tone: string }> = {
  reserved: { label: "محجوز", tone: "reserved" },
  arrived: { label: "وصل وينتظر", tone: "arrived" },
  in_progress: { label: "قيد الخدمة", tone: "progress" },
  delayed: { label: "متأخر", tone: "delayed" },
  completed: { label: "اكتمل", tone: "completed" },
  no_show: { label: "لم يحضر", tone: "danger" },
  canceled: { label: "ملغي", tone: "danger" },
};

const barberStatusMeta: Record<string, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  available: { label: "متاح", tone: "available", icon: CheckCircle2 },
  busy: { label: "مع عميل", tone: "busy", icon: Scissors },
  break: { label: "استراحة", tone: "break", icon: Coffee },
  needs_confirmation: { label: "يحتاج تأكيد", tone: "attention", icon: AlertTriangle },
};

const formatSource = (source: Booking["source"]) => ({ whatsapp: "واتساب", phone: "هاتف", reception: "استقبال", walk_in: "Walk-in" }[source]);

function StatCard({ label, value, helper, icon: Icon, tone }: { label: string; value: number; helper: string; icon: typeof Users; tone: string }) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-icon"><Icon size={18} strokeWidth={2.2} /></div>
      <div><span className="stat-label">{label}</span><strong>{value}</strong><small>{helper}</small></div>
    </div>
  );
}

function BookingCard({ booking, barbers, onAction }: { booking: Booking; barbers: Dashboard["barbers"]; onAction: (booking: Booking, action: string) => void }) {
  const meta = statusMeta[booking.status];
  const barber = barbers.find(item => item.id === booking.barberId);
  const isActive = booking.status === "in_progress" || booking.status === "delayed";
  return (
    <article className={`booking-card ${meta.tone}`}>
      <div className="booking-accent" />
      <div className="booking-card-top">
        <div>
          <div className="booking-time"><Clock3 size={14} /> {booking.scheduledStart} <span>—</span> {booking.scheduledEnd}</div>
          <h3>{booking.customerName}</h3>
        </div>
        <span className={`status-pill ${meta.tone}`}>{meta.label}</span>
      </div>
      <div className="booking-meta">
        <span><Scissors size={14} /> {booking.service}</span>
        <span><Users size={14} /> {barber?.name ?? "غير محدد"} · {booking.chair}</span>
      </div>
      <div className="booking-timing">
        <span>مخطط <b>{booking.scheduledStart}–{booking.scheduledEnd}</b></span>
        {booking.actualStart && <span>فعلي <b>{booking.actualStart}–{booking.actualEnd ?? booking.expectedEnd ?? "الآن"}</b></span>}
      </div>
      {booking.note && <div className="booking-note"><AlertTriangle size={14} /> {booking.note}</div>}
      <div className="booking-actions">
        {booking.status === "reserved" && !booking.isConfirmed && <button className="action-button primary" onClick={() => onAction(booking, "confirm")}><Check size={14} /> تأكيد</button>}
        {booking.status === "reserved" && <button className="action-button" onClick={() => onAction(booking, "arrived")}><CheckCircle2 size={14} /> وصل</button>}
        {booking.status === "arrived" && <button className="action-button primary" onClick={() => onAction(booking, "start")}><Zap size={14} /> بدأ</button>}
        {isActive && <button className="action-button success" onClick={() => onAction(booking, "complete")}><Check size={14} /> خلص</button>}
        {(booking.status === "in_progress" || booking.status === "arrived") && <button className="action-button" onClick={() => onAction(booking, "extend")}><TimerReset size={14} /> +15 د</button>}
        {(booking.status === "reserved" || booking.status === "arrived") && <button className="action-button warning" onClick={() => onAction(booking, "delay")}><Clock3 size={14} /> تأخير</button>}
        {(booking.status === "reserved" || booking.status === "arrived" || booking.status === "delayed") && <button className="icon-action" aria-label="إعادة جدولة" title="إعادة جدولة" onClick={() => onAction(booking, "reschedule")}><RefreshCw size={15} /></button>}
        {(booking.status === "reserved" || booking.status === "arrived" || booking.status === "delayed") && <button className="icon-action danger" aria-label="إلغاء" title="إلغاء" onClick={() => onAction(booking, "cancel")}><X size={15} /></button>}
      </div>
      <div className="booking-footer"><span>{formatSource(booking.source)}</span><span>{booking.isConfirmed ? "تأكيد موجود" : "بانتظار تأكيد"}</span></div>
    </article>
  );
}

function WalkInModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (input: { customerName: string; phone: string; service: string; barberPreference?: string }) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("قص شعر");
  const [preference, setPreference] = useState("أي حلاق");
  if (!open) return null;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2 || phone.trim().length < 5) return toast.error("اكتب اسم العميل ورقم الهاتف أولاً");
    onSubmit({ customerName: name.trim(), phone: phone.trim(), service, barberPreference: preference });
    setName(""); setPhone(""); setService("قص شعر"); setPreference("أي حلاق"); onClose();
  };
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <form className="modal" onSubmit={submit} onMouseDown={event => event.stopPropagation()}>
      <div className="modal-header"><div><span className="eyebrow">تسجيل سريع</span><h2>عميل Walk-in جديد</h2></div><button type="button" className="icon-action" onClick={onClose}><X size={18} /></button></div>
      <p className="modal-subtitle">سجّل الحد الأدنى الآن، وعدّل التفاصيل لاحقاً بدون ما يضيع العميل في الزحمة.</p>
      <label>اسم العميل<input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="مثال: محمد حسن" /></label>
      <label>رقم الهاتف<input value={phone} onChange={event => setPhone(event.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" /></label>
      <div className="form-grid"><label>الخدمة<select value={service} onChange={event => setService(event.target.value)}><option>قص شعر</option><option>شعر وذقن</option><option>تدريج + ذقن</option><option>قص شعر × 2</option></select></label><label>تفضيل الحلاق<select value={preference} onChange={event => setPreference(event.target.value)}><option>أي حلاق</option><option>عمر</option><option>كريم</option><option>علي</option><option>حسن</option></select></label></div>
      <div className="modal-actions"><button type="button" className="action-button" onClick={onClose}>إلغاء</button><button type="submit" className="action-button primary"><UserPlus size={15} /> إضافة لقائمة الانتظار</button></div>
    </form>
  </div>;
}

export default function Home() {
  const dashboard = trpc.dashboard.snapshot.useQuery(undefined, { refetchInterval: 15000 });
  const utils = trpc.useUtils();
  const updateBooking = trpc.dashboard.updateBooking.useMutation({ onSuccess: () => utils.dashboard.snapshot.invalidate() });
  const addWalkIn = trpc.walkIns.add.useMutation({ onSuccess: () => utils.dashboard.snapshot.invalidate() });
  const assignWalkIn = trpc.walkIns.assign.useMutation({ onSuccess: () => utils.dashboard.snapshot.invalidate() });
  const resetDemo = trpc.dashboard.resetDemo.useMutation({ onSuccess: () => { utils.dashboard.snapshot.invalidate(); toast.success("رجّعنا بيانات يوم الضغط للتجربة"); } });
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("اليوم");
  const [queueOpen, setQueueOpen] = useState(true);

  const data = dashboard.data;
  const action = (booking: Booking, actionName: string) => {
    updateBooking.mutate({ bookingId: booking.id, action: actionName as never }, { onSuccess: () => toast.success("تم تحديث الحالة وتسجيل الحدث"), onError: error => toast.error(error.message) });
  };
  const handleAddWalkIn = (input: { customerName: string; phone: string; service: string; barberPreference?: string }) => {
    addWalkIn.mutate(input, { onSuccess: () => toast.success("اتسجل العميل في قائمة الانتظار"), onError: error => toast.error(error.message) });
  };
  const handleAssign = (queueId: string, barberId: string) => {
    assignWalkIn.mutate({ queueId, barberId }, { onSuccess: () => toast.success("تم إدخال العميل إلى حالة وصل وينتظر"), onError: error => toast.error(error.message) });
  };
  const activeBookings = useMemo(() => data?.bookings.filter(booking => ["in_progress", "delayed"].includes(booking.status)) ?? [], [data?.bookings]);
  const arrivedBookings = useMemo(() => data?.bookings.filter(booking => booking.status === "arrived") ?? [], [data?.bookings]);
  const upcomingBookings = useMemo(() => data?.bookings.filter(booking => booking.status === "reserved") ?? [], [data?.bookings]);

  if (dashboard.isLoading || !data) return <div className="loading-screen"><Loader2 className="spin" size={28} /><span>بنجهز غرفة التشغيل...</span></div>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Scissors size={21} /></div><div><strong>Barber<span>Ops</span></strong><small>غرفة التشغيل</small></div></div>
      <nav className="side-nav"><button className="nav-item active"><HomeIcon size={17} /> <span>اليوم</span><span className="nav-count">{data.stats.attention}</span></button><button className="nav-item"><ListChecks size={17} /> <span>الحجوزات</span></button><button className="nav-item"><Users size={17} /> <span>العملاء</span></button></nav>
      <div className="sidebar-bottom"><div className="live-dot"><i /> النظام يعمل <span>Live</span></div><button className="nav-item muted"><Menu size={17} /> <span>إعدادات التشغيل</span></button></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div><div className="breadcrumb"><span>الصالون الرئيسي</span><ArrowLeft size={14} /><b>غرفة التشغيل</b></div><h1>صباح الخير يا سارة <span>—</span> خلّي اليوم ماشي على الحقيقة</h1></div><div className="top-actions"><div className="live-clock"><span>الآن</span><b>{data.now}</b><small>{data.dateLabel}</small></div><button className="icon-action notification" aria-label="التنبيهات"><Bell size={18} />{data.alerts.length > 0 && <i>{data.alerts.length}</i>}</button><button className="avatar">س</button></div></header>
      <div className="tab-row"><div className="tabs"><button className={activeTab === "اليوم" ? "tab active" : "tab"} onClick={() => setActiveTab("اليوم")}>اليوم <span>5</span></button><button className={activeTab === "الأسبوع" ? "tab active" : "tab"} onClick={() => setActiveTab("الأسبوع")}>الأسبوع</button></div><div className="header-actions"><button className="secondary-button" onClick={() => resetDemo.mutate()} disabled={resetDemo.isPending}><RefreshCw size={15} className={resetDemo.isPending ? "spin" : ""} /> إعادة بيانات التجربة</button><button className="primary-button" onClick={() => setShowModal(true)}><Plus size={17} /> Walk-in جديد</button></div></div>
      <section className="stats-row"><StatCard label="حجوزات اليوم" value={data.stats.todayBookings} helper="من 8:00 إلى 22:00" icon={ListChecks} tone="blue" /><StatCard label="قيد الخدمة" value={data.stats.activeServices} helper="واحد منهم متأخر" icon={Scissors} tone="teal" /><StatCard label="في الانتظار" value={data.stats.waiting} helper="2 Walk-in + واصل" icon={Users} tone="amber" /><StatCard label="يحتاج تدخّل" value={data.stats.attention} helper="راجعهم قبل الموعد التالي" icon={AlertTriangle} tone="coral" /></section>
      {data.alerts.length > 0 && <section className="alert-strip"><div className="alert-strip-title"><span className="pulse-dot" /> <b>محتاجين عينك</b><small>{data.alerts.length} حالات مفتوحة</small></div><div className="alert-items">{data.alerts.map(alert => <div className={`alert-chip ${alert.severity}`} key={alert.id}><AlertTriangle size={14} /><span><b>{alert.title}</b><small>{alert.detail}</small></span>{alert.bookingId && <button onClick={() => { const booking = data.bookings.find(item => item.id === alert.bookingId); if (booking) action(booking, booking.status === "reserved" ? "confirm" : "start"); }}>{alert.actionLabel}</button>}</div>)}</div></section>}
      <section className="workspace-grid">
        <div className="operations-column">
          <div className="section-heading"><div><span className="eyebrow">Live floor</span><h2>الأرضية الآن</h2><p>الحالة الفعلية أهم من الجدول — آخر تحديث تلقائي منذ لحظات</p></div><span className="updated-badge"><span /> محدث الآن</span></div>
          <div className="barbers-row">{data.barbers.map(barber => { const meta = barberStatusMeta[barber.status]; const Icon = meta.icon; const active = data.bookings.find(booking => booking.barberId === barber.id && ["in_progress", "delayed"].includes(booking.status)); return <div className={`barber-chip ${meta.tone}`} key={barber.id}><div className="barber-avatar">{barber.initials}</div><div><b>{barber.name}</b><small><Icon size={12} /> {meta.label}</small></div><span className="chair-label">{barber.chair}</span>{active && <span className="mini-service">{active.customerName}</span>}</div>; })}</div>
          <div className="board-section"><div className="board-heading"><h3>قيد التنفيذ <span>{activeBookings.length}</span></h3><span>لا يتم الإغلاق تلقائياً</span></div><div className="cards-grid">{activeBookings.map(booking => <BookingCard key={booking.id} booking={booking} barbers={data.barbers} onAction={action} />)}{activeBookings.length === 0 && <div className="empty-state">لا توجد خدمات مفتوحة حالياً.</div>}</div></div>
          <div className="board-section"><div className="board-heading"><h3>وصل وينتظر <span>{arrivedBookings.length}</span></h3><span>اضغط بدأ عند جلوس العميل</span></div><div className="cards-grid">{arrivedBookings.map(booking => <BookingCard key={booking.id} booking={booking} barbers={data.barbers} onAction={action} />)}</div></div>
          <div className="board-section"><div className="board-heading"><h3>القادم <span>{upcomingBookings.length}</span></h3><span>الحجوزات التالية</span></div><div className="cards-grid two-col">{upcomingBookings.map(booking => <BookingCard key={booking.id} booking={booking} barbers={data.barbers} onAction={action} />)}</div></div>
        </div>
        <aside className="side-panel">
          <div className="panel-card queue-card"><div className="panel-heading"><div><span className="eyebrow">لا عميل يضيع</span><h2>قائمة الانتظار</h2></div><button className="collapse-button" onClick={() => setQueueOpen(value => !value)}><ChevronDown size={16} className={!queueOpen ? "rotate" : ""} /></button></div>{queueOpen && <div className="queue-list">{data.queue.map(entry => <div className="queue-item" key={entry.id}><div className="queue-number">{entry.id.slice(-2)}</div><div className="queue-main"><b>{entry.customerName}</b><span>{entry.service} · {entry.barberPreference}</span><small><Clock3 size={12} /> دخل {entry.arrivedAt} · انتظار متوقع {entry.estimatedWait} د</small></div><div className="queue-assign"><select defaultValue="" onChange={event => { if (event.target.value) handleAssign(entry.id, event.target.value); }}><option value="">إسناد</option>{data.barbers.filter(barber => barber.status === "available").map(barber => <option value={barber.id} key={barber.id}>{barber.name} · {barber.chair}</option>)}</select></div></div>)}{data.queue.length === 0 && <div className="empty-state">القائمة فاضية — ممتاز.</div>}<button className="queue-add" onClick={() => setShowModal(true)}><Plus size={15} /> تسجيل عميل جديد في الانتظار</button></div>}</div>
          <div className="panel-card event-card"><div className="panel-heading"><div><span className="eyebrow">Audit trail</span><h2>آخر الحركة</h2></div><button className="text-button">عرض الكل <ArrowLeft size={14} /></button></div><div className="event-list">{data.events.map(event => <div className="event-item" key={event.id}><div className={`event-dot ${event.tone}`}><Check size={12} /></div><div><b>{event.label}</b><span>{event.detail}</span><small>{event.at} · {event.actor}</small></div></div>)}</div></div>
          <div className="principle-card"><Zap size={18} /><div><b>قاعدة اليوم</b><p>انتهاء الوقت المخطط لا يعني أن الخدمة خلصت. سجّل الواقع أولاً.</p></div></div>
        </aside>
      </section>
    </main>
    <WalkInModal open={showModal} onClose={() => setShowModal(false)} onSubmit={handleAddWalkIn} />
  </div>;
}
