export type BookingStatus =
  | "reserved"
  | "arrived"
  | "in_progress"
  | "delayed"
  | "completed"
  | "no_show"
  | "canceled";

export type BarberStatus = "available" | "busy" | "break" | "needs_confirmation";
export type AlertSeverity = "critical" | "warning" | "info";

import { loadOpsState, saveOpsState } from "./db";

export interface Barber {
  id: string;
  name: string;
  initials: string;
  chair: string;
  status: BarberStatus;
  specialty: string;
}

export interface Booking {
  id: string;
  customerName: string;
  phone: string;
  service: string;
  duration: number;
  barberId: string;
  chair: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: BookingStatus;
  source: "whatsapp" | "phone" | "walk_in" | "reception";
  isConfirmed: boolean;
  actualArrival?: string;
  actualStart?: string;
  actualEnd?: string;
  expectedEnd?: string;
  addedServices: string[];
  note?: string;
}

export interface QueueEntry {
  id: string;
  customerName: string;
  phone: string;
  service: string;
  barberPreference?: string;
  arrivedAt: string;
  estimatedWait: number;
  source: "walk_in";
}

export interface EventLog {
  id: string;
  bookingId?: string;
  queueId?: string;
  actor: string;
  type: string;
  label: string;
  detail: string;
  at: string;
  tone: "neutral" | "success" | "warning" | "danger";
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  bookingId?: string;
  queueId?: string;
  actionLabel?: string;
}

export interface StoreState {
  barbers: Barber[];
  bookings: Booking[];
  queue: QueueEntry[];
  events: EventLog[];
}

const now = "19:20";

const initialState = (): StoreState => ({
  barbers: [
    { id: "omar", name: "عمر", initials: "ع", chair: "كرسي 1", status: "busy", specialty: "قصات كلاسيك" },
    { id: "karim", name: "كريم", initials: "ك", chair: "كرسي 2", status: "needs_confirmation", specialty: "تدريج ولحية" },
    { id: "ali", name: "علي", initials: "ع", chair: "كرسي 3", status: "available", specialty: "ستايل سريع" },
    { id: "hassan", name: "حسن", initials: "ح", chair: "كرسي 4", status: "break", specialty: "خدمات VIP" },
  ],
  bookings: [
    {
      id: "bk-1001",
      customerName: "يوسف سمير",
      phone: "01001234567",
      service: "شعر وذقن",
      duration: 45,
      barberId: "omar",
      chair: "كرسي 1",
      scheduledStart: "19:00",
      scheduledEnd: "19:45",
      status: "in_progress",
      source: "whatsapp",
      isConfirmed: true,
      actualArrival: "18:56",
      actualStart: "19:05",
      expectedEnd: "19:55",
      addedServices: ["تنظيف سريع"],
      note: "أضاف تنظيف سريع أثناء الزيارة",
    },
    {
      id: "bk-1002",
      customerName: "محمود عادل",
      phone: "01123456789",
      service: "قص شعر",
      duration: 30,
      barberId: "karim",
      chair: "كرسي 2",
      scheduledStart: "19:15",
      scheduledEnd: "19:45",
      status: "delayed",
      source: "phone",
      isConfirmed: true,
      actualArrival: "19:12",
      note: "الحلاق لم يبدأ بعد — يحتاج تدخل",
      addedServices: [],
    },
    {
      id: "bk-1003",
      customerName: "سامح فوزي",
      phone: "01234567890",
      service: "تدريج + ذقن",
      duration: 45,
      barberId: "ali",
      chair: "كرسي 3",
      scheduledStart: "19:30",
      scheduledEnd: "20:15",
      status: "arrived",
      source: "reception",
      isConfirmed: true,
      actualArrival: "19:24",
      expectedEnd: "20:15",
      addedServices: [],
    },
    {
      id: "bk-1004",
      customerName: "أحمد رجب",
      phone: "01099887766",
      service: "قص شعر",
      duration: 30,
      barberId: "hassan",
      chair: "كرسي 4",
      scheduledStart: "19:45",
      scheduledEnd: "20:15",
      status: "reserved",
      source: "whatsapp",
      isConfirmed: false,
      addedServices: [],
    },
    {
      id: "bk-1005",
      customerName: "رامي السيد",
      phone: "01011112222",
      service: "شعر وذقن",
      duration: 45,
      barberId: "omar",
      chair: "كرسي 1",
      scheduledStart: "20:15",
      scheduledEnd: "21:00",
      status: "reserved",
      source: "whatsapp",
      isConfirmed: true,
      addedServices: [],
    },
  ],
  queue: [
    {
      id: "wi-2001",
      customerName: "كريم حسن",
      phone: "01055556666",
      service: "قص شعر",
      barberPreference: "أي حلاق",
      arrivedAt: "19:02",
      estimatedWait: 15,
      source: "walk_in",
    },
    {
      id: "wi-2002",
      customerName: "مينا وطفله",
      phone: "01077778888",
      service: "قص شعر × 2",
      barberPreference: "يفضل عمر أو علي",
      arrivedAt: "19:14",
      estimatedWait: 28,
      source: "walk_in",
    },
  ],
  events: [
    { id: "ev-1", bookingId: "bk-1001", actor: "النظام", type: "started", label: "بدأت الخدمة", detail: "يوسف سمير — شعر وذقن", at: "19:05", tone: "success" },
    { id: "ev-2", queueId: "wi-2002", actor: "سارة", type: "walk_in", label: "Walk-in جديد", detail: "مينا وطفله أضيفا لقائمة الانتظار", at: "19:14", tone: "neutral" },
    { id: "ev-3", bookingId: "bk-1002", actor: "النظام", type: "delay", label: "تأخير يحتاج متابعة", detail: "موعد محمود عادل متأخر 12 دقيقة", at: "19:18", tone: "warning" },
    { id: "ev-4", bookingId: "bk-1001", actor: "عمر", type: "service_added", label: "إضافة خدمة", detail: "تمت إضافة تنظيف سريع — النهاية المتوقعة 19:55", at: "19:10", tone: "neutral" },
  ],
});

let state = initialState();
let eventCounter = 10;
let queueCounter = 3;

export async function hydrateStore() {
  if (process.env.PERSISTENCE_MODE !== "postgres") return;
  const persisted = await loadOpsState();
  if (persisted && typeof persisted === "object") {
    state = persisted as StoreState;
    const eventIds = state.events.map(event => Number(event.id.replace("ev-", ""))).filter(Number.isFinite);
    const queueIds = state.queue.map(entry => Number(entry.id.replace("wi-200", ""))).filter(Number.isFinite);
    eventCounter = Math.max(10, ...eventIds) + 1;
    queueCounter = Math.max(3, ...queueIds) + 1;
  } else {
    await saveOpsState(state);
  }
}

const persistStore = async () => {
  if (process.env.PERSISTENCE_MODE === "postgres") await saveOpsState(state);
};

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (total: number) => {
  const normalized = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
};

const addMinutes = (value: string, amount: number) => minutesToTime(timeToMinutes(value) + amount);

const addEvent = (event: Omit<EventLog, "id" | "at"> & { at?: string }) => {
  state.events.unshift({
    ...event,
    id: `ev-${eventCounter++}`,
    at: event.at ?? now,
  });
};

const getBarber = (barberId: string) => state.barbers.find(barber => barber.id === barberId);

const syncBarberStatuses = () => {
  state.barbers = state.barbers.map(barber => {
    const active = state.bookings.find(booking => booking.barberId === barber.id && ["in_progress", "delayed"].includes(booking.status));
    if (active) return { ...barber, status: active.status === "delayed" ? "needs_confirmation" : "busy" };
    if (barber.status === "busy" || barber.status === "needs_confirmation") return { ...barber, status: "available" };
    return barber;
  });
};

export const getDashboard = () => {
  syncBarberStatuses();
  const relevant = state.bookings.filter(booking => !["canceled"].includes(booking.status));
  const alerts: Alert[] = [];
  const unconfirmed = relevant.find(booking => booking.status === "reserved" && !booking.isConfirmed);
  if (unconfirmed) {
    alerts.push({
      id: "alert-unconfirmed",
      severity: "warning",
      title: "حجز غير مؤكد",
      detail: `${unconfirmed.customerName} عند ${unconfirmed.scheduledStart} مع ${getBarber(unconfirmed.barberId)?.name ?? "—"}`,
      bookingId: unconfirmed.id,
      actionLabel: "تأكيد الحجز",
    });
  }
  const delayed = relevant.find(booking => booking.status === "delayed");
  if (delayed) {
    alerts.push({
      id: "alert-delay",
      severity: "critical",
      title: "تأخير يحتاج قرار",
      detail: `${delayed.customerName} متأخر عن البداية — راجع الحلاق أو اقترح بديلاً`,
      bookingId: delayed.id,
      actionLabel: "فتح الحجز",
    });
  }
  const longWait = state.queue.find(entry => entry.estimatedWait >= 25);
  if (longWait) {
    alerts.push({
      id: "alert-wait",
      severity: "info",
      title: "انتظار طويل",
      detail: `${longWait.customerName} في القائمة منذ ${longWait.arrivedAt} — المتوقع ${longWait.estimatedWait} دقيقة`,
      queueId: longWait.id,
      actionLabel: "راجع القائمة",
    });
  }

  return {
    now,
    dateLabel: "الاثنين، 16 نوفمبر 2026",
    stats: {
      todayBookings: relevant.length,
      activeServices: relevant.filter(booking => ["in_progress", "delayed"].includes(booking.status)).length,
      waiting: state.queue.length + relevant.filter(booking => booking.status === "arrived").length,
      attention: alerts.length,
    },
    barbers: state.barbers,
    bookings: [...state.bookings].sort((a, b) => timeToMinutes(a.scheduledStart) - timeToMinutes(b.scheduledStart)),
    queue: state.queue,
    alerts,
    events: state.events.slice(0, 12),
  };
};

export type BookingAction = "confirm" | "arrived" | "start" | "complete" | "extend" | "delay" | "no_show" | "cancel" | "reschedule";

export const updateBooking = async (bookingId: string, action: BookingAction) => {
  const booking = state.bookings.find(item => item.id === bookingId);
  if (!booking) throw new Error("الحجز غير موجود");
  const barber = getBarber(booking.barberId);
  const actor = "موظف الاستقبال";

  switch (action) {
    case "confirm":
      booking.isConfirmed = true;
      addEvent({ bookingId, actor, type: "confirmed", label: "تم تأكيد الحجز", detail: `${booking.customerName} — ${booking.scheduledStart}`, tone: "success" });
      break;
    case "arrived":
      booking.status = "arrived";
      booking.actualArrival = now;
      booking.expectedEnd = booking.expectedEnd ?? booking.scheduledEnd;
      addEvent({ bookingId, actor, type: "arrived", label: "وصل العميل", detail: `${booking.customerName} عند ${booking.scheduledStart}`, tone: "neutral" });
      break;
    case "start":
      booking.status = "in_progress";
      booking.actualStart = now;
      booking.expectedEnd = booking.expectedEnd ?? addMinutes(now, booking.duration);
      addEvent({ bookingId, actor, type: "started", label: "بدأت الخدمة", detail: `${booking.customerName} مع ${barber?.name ?? "الحلاق"}`, tone: "success" });
      break;
    case "complete":
      booking.status = "completed";
      booking.actualEnd = now;
      addEvent({ bookingId, actor, type: "completed", label: "اكتملت الخدمة", detail: `${booking.customerName} — وقت النهاية الفعلي ${now}`, tone: "success" });
      break;
    case "extend":
      booking.duration += 15;
      booking.expectedEnd = addMinutes(booking.expectedEnd ?? booking.scheduledEnd, 15);
      booking.addedServices = [...booking.addedServices, "تمديد 15 دقيقة"];
      booking.status = booking.status === "arrived" ? "in_progress" : booking.status;
      addEvent({ bookingId, actor, type: "extended", label: "تمديد الخدمة", detail: `النهاية المتوقعة أصبحت ${booking.expectedEnd}`, tone: "warning" });
      break;
    case "delay":
      booking.status = "delayed";
      booking.note = "تأخير يحتاج قرار من الاستقبال";
      addEvent({ bookingId, actor, type: "delay", label: "تم تسجيل تأخير", detail: `${booking.customerName} يحتاج متابعة`, tone: "warning" });
      break;
    case "no_show":
      booking.status = "no_show";
      addEvent({ bookingId, actor, type: "no_show", label: "لم يحضر العميل", detail: `${booking.customerName} — تم تحرير الموعد`, tone: "danger" });
      break;
    case "cancel":
      booking.status = "canceled";
      addEvent({ bookingId, actor, type: "canceled", label: "تم إلغاء الحجز", detail: `${booking.customerName} — مصدر ${booking.source}`, tone: "danger" });
      break;
    case "reschedule":
      booking.status = "reserved";
      booking.isConfirmed = false;
      booking.scheduledStart = addMinutes(booking.scheduledStart, 60);
      booking.scheduledEnd = addMinutes(booking.scheduledEnd, 60);
      booking.note = "أعيدت الجدولة ويحتاج الموعد تأكيداً";
      addEvent({ bookingId, actor, type: "rescheduled", label: "إعادة جدولة", detail: `${booking.customerName} — الموعد الجديد ${booking.scheduledStart}`, tone: "warning" });
      break;
  }
  syncBarberStatuses();
  await persistStore();
  return getDashboard();
};

export const addWalkIn = async (input: { customerName: string; phone: string; service: string; barberPreference?: string }) => {
  const entry: QueueEntry = {
    id: `wi-200${queueCounter++}`,
    customerName: input.customerName,
    phone: input.phone,
    service: input.service,
    barberPreference: input.barberPreference || "أي حلاق",
    arrivedAt: now,
    estimatedWait: 20 + state.queue.length * 6,
    source: "walk_in",
  };
  state.queue.push(entry);
  addEvent({ queueId: entry.id, actor: "موظف الاستقبال", type: "walk_in", label: "Walk-in جديد", detail: `${entry.customerName} أضيف إلى قائمة الانتظار`, tone: "neutral" });
  await persistStore();
  return getDashboard();
};

export const assignWalkIn = async (queueId: string, barberId: string) => {
  const index = state.queue.findIndex(item => item.id === queueId);
  if (index === -1) throw new Error("عميل الانتظار غير موجود");
  const queueEntry = state.queue[index];
  const barber = getBarber(barberId);
  if (!barber) throw new Error("الحلاق غير موجود");
  const booking: Booking = {
    id: `bk-walk-${Date.now()}`,
    customerName: queueEntry.customerName,
    phone: queueEntry.phone,
    service: queueEntry.service,
    duration: queueEntry.service.includes("×") ? 60 : 30,
    barberId,
    chair: barber.chair,
    scheduledStart: now,
    scheduledEnd: addMinutes(now, queueEntry.service.includes("×") ? 60 : 30),
    status: "arrived",
    source: "walk_in",
    isConfirmed: true,
    actualArrival: now,
    expectedEnd: addMinutes(now, queueEntry.service.includes("×") ? 60 : 30),
    addedServices: [],
  };
  state.queue.splice(index, 1);
  state.bookings.push(booking);
  addEvent({ bookingId: booking.id, queueId, actor: "موظف الاستقبال", type: "assigned", label: "إدخال من قائمة الانتظار", detail: `${queueEntry.customerName} مع ${barber.name} — ${barber.chair}`, tone: "success" });
  await persistStore();
  return getDashboard();
};

export const resetDemo = async () => {
  state = initialState();
  eventCounter = 10;
  queueCounter = 3;
  await persistStore();
  return getDashboard();
};

export const getDueReminders = () => {
  const dashboard = getDashboard();
  return dashboard.bookings.filter(booking => booking.status === "reserved" && booking.isConfirmed).map(booking => ({
    bookingId: booking.id,
    customerName: booking.customerName,
    phone: booking.phone,
    service: booking.service,
    scheduledStart: booking.scheduledStart,
    barberName: getBarber(booking.barberId)?.name ?? "الحلاق",
    message: `تذكير: عندك ${booking.service} اليوم الساعة ${booking.scheduledStart} مع ${getBarber(booking.barberId)?.name ?? "الحلاق"}.`,
  }));
};

export const getDelayAlerts = () => getDashboard().alerts.filter(alert => alert.severity === "critical");

export const getReconciliation = () => {
  const dashboard = getDashboard();
  const openBookings = dashboard.bookings.filter(booking => ["reserved", "arrived", "in_progress", "delayed"].includes(booking.status));
  const unresolved = dashboard.bookings.filter(booking => ["arrived", "in_progress", "delayed"].includes(booking.status));
  return {
    date: dashboard.dateLabel,
    generatedAt: dashboard.now,
    totalBookings: dashboard.bookings.length,
    openBookings: openBookings.length,
    unresolvedCount: unresolved.length,
    queueCount: dashboard.queue.length,
    alerts: dashboard.alerts,
    unresolved: unresolved.map(booking => ({ id: booking.id, customerName: booking.customerName, status: booking.status, barberId: booking.barberId })),
    recommendation: unresolved.length > 0 ? "راجع الخدمات المفتوحة قبل إغلاق الوردية" : "اليوم متسوي — لا توجد حالات مفتوحة",
  };
};

export const recordReconciliation = async (note = "تمت مصالحة نهاية اليوم") => {
  addEvent({ actor: "n8n", type: "reconciliation", label: "مصالحة تشغيلية", detail: note, tone: "success" });
  await persistStore();
  return getReconciliation();
};
