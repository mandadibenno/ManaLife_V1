import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Pill,
  Heart,
  LayoutDashboard,
  ListTodo,
  ShoppingBasket,
  WalletCards,
  CalendarDays,
  Settings2,
  Plus,
  Bell,
  Search,
  ChevronRight,
  ChevronLeft,
  Check,
  LockKeyhole,
  LogOut,
  Menu,
  X,
  Sparkles,
  Repeat2,
  CircleCheck,
  Clock3,
  UsersRound,
  House,
  ArrowUpRight,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  ShieldCheck,
  Copy,
  Mail,
  CheckCircle2,
  AlertCircle,
  Leaf,
  Coffee,
  ChevronDown,
  BarChart3,
} from "lucide-react";
import { configured, supabase } from "./supabase";
import {
  demoUser,
  demoFamily,
  demoPeople,
  loadDemo,
  saveDemo,
  resetDemo,
  loadHousehold,
  loadRemote,
  createFamily,
  joinFamily,
  inviteFamily,
  upsertRemote,
  deleteRemote,
  setRemoteCompletion,
} from "./store";
import {
  isoDate,
  addDays,
  dateLabel,
  fullDate,
  money,
  shortName,
  isTaskDue,
  taskOccurrence,
  billOccurrence,
  uid,
} from "./utils";
import "./styles.css";

const today = isoDate();
const EMPTY = {
  tasks: [],
  task_completions: [],
  groceries: [],
  bills: [],
  bill_payments: [],
  events: [],
};
const SECTIONS = [
  {
    key: "today",
    title: "Overview",
    caption: "Everything that matters today",
    icon: LayoutDashboard,
  },
  {
    key: "tasks",
    title: "Shared Tasks",
    caption: "A little progress every day",
    icon: ListTodo,
  },
  {
    key: "groceries",
    title: "Groceries",
    caption: "One list, shared across your home",
    icon: ShoppingBasket,
  },
  {
    key: "bills",
    title: "Bills & Money",
    caption: "Never miss a due date",
    icon: WalletCards,
  },
  {
    key: "expenses",
    title: "Expenses",
    caption: "Daily spending tracker",
    icon: BarChart3,
  },

  {
    key: "reminders",
    title: "Reminders",
    caption: "Never miss anything",
    icon: Bell,
  },
  {
    key: "habits",
    title: "Habit Tracker",
    caption: "Build better routines",
    icon: Repeat2,
  },
  {
    key: "periods",
    title: "Period Tracker",
    caption: "Private cycle tracking",
    icon: Heart,
  },
  {
    key: "medicines",
    title: "Medicine Tracker",
    caption: "Medication schedule & history",
    icon: Pill,
  },
  {
    key: "meals",
    title: "Meal Planner",
    caption: "Plan family meals",
    icon: Coffee,
  },
  {
    key: "documents",
    title: "Family Documents",
    caption: "Important family files",
    icon: LockKeyhole,
  },
  {
    key: "calendar",
    title: "Calendar",
    caption: "The moments that matter",
    icon: CalendarDays,
  },
  {
    key: "settings",
    title: "Settings",
    caption: "Your home, your people",
    icon: Settings2,
  },
];
const LABELS = {
  tasks: "Task",
  groceries: "Grocery item",
  bills: "Bill",
  events: "Event",
};
const FORM_DEFAULT = {
  tasks: {
    title: "",
    description: "",
    due_on: today,
    time: "",
    repeat: "none",
    priority: "medium",
    category: "Home",
    assigned_to: "",
  },
  groceries: { name: "", quantity: "", checked: false },
  bills: {
    title: "",
    amount: "",
    category: "Utilities",
    due_on: today,
    repeat: "monthly",
  },
  events: { title: "", event_date: today, time: "", category: "Family" },
};
const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};
const doneFor = (table, id, date, rows) =>
  rows.some(
    (r) =>
      r[table === "tasks" ? "task_id" : "bill_id"] === id &&
      r.occurrence_on === date,
  );
const priorityLabel = {
  low: "Low priority",
  medium: "Medium priority",
  high: "High priority",
};
function initials(name = "M") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "M"
  );
}
function IconButton({ onClick, icon: Icon, title, className = "" }) {
  return (
    <button
      type="button"
      className={`icon-btn ${className}`}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      <Icon size={19} />
    </button>
  );
}
function Logo() {
  return (
    <div className="brandmark">
      <div className="brand-icon">
        <Heart size={22} strokeWidth={2.8} fill="currentColor" />
      </div>
      <div>
        <div className="brand-name">
          mana<span>life</span>
        </div>
        <div className="brand-tagline">life, together.</div>
      </div>
    </div>
  );
}
function EmptyState({ icon: Icon = Leaf, heading, body, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={25} />
      </div>
      <h3>{heading}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}
function SectionHeader({ eyebrow, title, description, right }) {
  return (
    <div className="section-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="subhead">{description}</p>
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}
function StatusPill({ children, variant = "neutral" }) {
  return <span className={`status-pill ${variant}`}>{children}</span>;
}
function ProtectedLabel() {
  return (
    <span className="visibility">
      <UsersRound size={12} /> Household
    </span>
  );
}
function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function TaskRow({
  task,
  checked,
  onToggle,
  onEdit,
  onDelete,
  people,
  compact = false,
}) {
  const who = people.find((p) => p.id === task.assigned_to)?.display_name;
  return (
    <div className={`task-row ${checked ? "is-done" : ""}`}>
      <button
        className={`round-check ${checked ? "checked" : ""}`}
        aria-label={checked ? "Mark not done" : "Mark done"}
        onClick={onToggle}
      >
        {checked && <Check size={15} strokeWidth={3} />}
      </button>
      <div className="task-row-content">
        <div className="task-row-title">{task.title}</div>
        <div className="task-row-meta">
          <span>
            <Clock3 size={12} />
            {task.time || dateLabel(task.due_on)}
          </span>
          {!compact && (
            <>
              <span>{task.category}</span>
              {task.repeat !== "none" && (
                <span>
                  <Repeat2 size={12} />
                  {task.repeat}
                </span>
              )}
            </>
          )}
          {who && <span>For {shortName(who)}</span>}
        </div>
      </div>
      {task.priority === "high" && (
        <span className="priority-dot" title="High priority" />
      )}
      {!compact && (
        <div className="item-actions">
          <IconButton icon={Pencil} title="Edit task" onClick={onEdit} />
          <IconButton icon={Trash2} title="Delete task" onClick={onDelete} />
        </div>
      )}
    </div>
  );
}

function ExpensesPage({ home, user }) {
  const [items, setItems] = useState([]);
  const [month, setMonth] = useState(isoDate().slice(0, 7));
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [type, setType] = useState("essential");
  const [date, setDate] = useState(isoDate());
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(null);
  const [budget, setBudget] = useState("");
  const [budgetInput, setBudgetInput] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const categories = [
    "Groceries",
    "Food",
    "Shopping",
    "Transport",
    "Health",
    "Bills",
    "Entertainment",
    "Other",
  ];

  const rupees = (n) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(n) || 0);

  const start = `${month}-01`;
  const end = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1),
  )
    .toISOString()
    .slice(0, 10);

  const panelStyle = {
    background: "#fff",
    border: "1px solid #e6ebe6",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  };

  const inputStyle = {
    padding: 11,
    border: "1px solid #dce6df",
    borderRadius: 9,
    width: "100%",
    minWidth: 0,
    background: "#fff",
    color: "#304e42",
  };

  const formStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
  };

  async function loadExpenses() {
    const { data, error: dbError } = await supabase
      .from("expenses")
      .select("*")
      .eq("household_id", home.id)
      .gte("spent_on", start)
      .lt("spent_on", end)
      .order("spent_on", { ascending: false });

    if (dbError) throw dbError;
    setItems(data || []);

    const result = await supabase
      .from("household_budgets")
      .select("monthly_limit")
      .eq("household_id", home.id)
      .eq("budget_month", start)
      .maybeSingle();

    if (result.error) throw result.error;

    const value = String(result.data?.monthly_limit ?? "");
    setBudget(value);
    setBudgetInput(value);
  }

  useEffect(() => {
    if (!home?.id) return;
    loadExpenses().catch((e) => setError(e.message));
  }, [home?.id, month]);

  const total = items.reduce((sum, x) => sum + Number(x.amount), 0);

  const optional = items
    .filter((x) => x.expense_type === "optional")
    .reduce((sum, x) => sum + Number(x.amount), 0);

  const essential = total - optional;

  const categoryTotals = categories
    .map((name) => ({
      name,
      amount: items
        .filter((x) => x.category === name)
        .reduce((sum, x) => sum + Number(x.amount), 0),
    }))
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const days = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)),
    0,
  ).getDate();

  const daily = Array.from({ length: days }, (_, i) => {
    const day = `${month}-${String(i + 1).padStart(2, "0")}`;
    return items
      .filter((x) => x.spent_on === day)
      .reduce((sum, x) => sum + Number(x.amount), 0);
  });

  const maxDaily = Math.max(1, ...daily);
  const budgetAmount = Number(budget) || 0;

  async function saveExpense(e) {
    e.preventDefault();
    setError("");
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setSaving(true);

    try {
      const values = {
        amount: Number(amount),
        category,
        expense_type: type,
        spent_on: date,
        note: note.trim(),
      };

      const result = editing
        ? await supabase
            .from("expenses")
            .update(values)
            .eq("id", editing)
            .eq("household_id", home.id)
        : await supabase.from("expenses").insert({
            ...values,
            household_id: home.id,
            created_by: user.id,
          });

      if (result.error) throw result.error;

      setAmount("");
      setCategory("Groceries");
      setType("essential");
      setDate(isoDate());
      setNote("");
      setEditing(null);
      await loadExpenses();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense(id) {
    if (!window.confirm("Delete this expense?")) return;

    const result = await supabase
      .from("expenses")
      .delete()
      .eq("id", id)
      .eq("household_id", home.id);

    if (result.error) {
      setError(result.error.message);
      return;
    }
    await loadExpenses().catch((e) => setError(e.message));
  }

  async function saveBudget() {
    if (
      budgetInput.trim() === "" ||
      !Number.isFinite(Number(budgetInput)) ||
      Number(budgetInput) < 0
    ) {
      setError("Enter a valid monthly budget.");
      return;
    }

    const result = await supabase.from("household_budgets").upsert(
      {
        household_id: home.id,
        budget_month: start,
        monthly_limit: Number(budgetInput),
        updated_by: user.id,
      },
      { onConflict: "household_id,budget_month" },
    );

    if (result.error) {
      setError(result.error.message);
      return;
    }

    await loadExpenses().catch((e) => setError(e.message));
  }

  return (
    <div>
      <SectionHeader
        eyebrow="FAMILY FINANCES"
        title="Daily Expenses"
        description="Track and understand your family spending."
      />

      <div style={{ ...panelStyle }}>
        <label>
          Select Month
          <input
            type="month"
            style={inputStyle}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
      </div>

      <div style={formStyle}>
        {[
          ["Total Expenses", total],
          ["Essential", essential],
          ["Review Spending", optional],
        ].map(([title, value]) => (
          <div key={title} style={panelStyle}>
            <p style={{ color: "#82968a", fontSize: 13 }}>{title}</p>
            <h2>{rupees(value)}</h2>
          </div>
        ))}
      </div>

      <div style={panelStyle}>
        <h3>Add Expense</h3>

        <form onSubmit={saveExpense} style={formStyle}>
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            placeholder="Amount ₹"
            style={inputStyle}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <input
            type="date"
            required
            style={inputStyle}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <select
            style={inputStyle}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>

          <select
            style={inputStyle}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="essential">Essential</option>
            <option value="optional">Optional / Review</option>
          </select>

          <input
            style={inputStyle}
            placeholder="Description"
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <button className="primary-btn" disabled={saving}>
            {saving ? "Saving..." : editing ? "Update Expense" : "Save Expense"}
          </button>
        </form>
      </div>

      <div style={panelStyle}>
        <h3>Monthly Budget</h3>
        <div style={formStyle}>
          <input
            type="number"
            min="0"
            style={inputStyle}
            placeholder="Budget ₹"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
          />
          <button className="primary-btn" onClick={saveBudget}>
            Save Budget
          </button>
        </div>
        {budgetAmount > 0 && (
          <p>
            {total > budgetAmount
              ? `${rupees(total - budgetAmount)} over budget`
              : `${rupees(budgetAmount - total)} remaining`}
          </p>
        )}
      </div>

      <div style={panelStyle}>
        <h3>Daily Spending Chart</h3>
        <div style={{ overflowX: "auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 7,
              height: 220,
              minWidth: 750,
              paddingTop: 15,
            }}
          >
            {daily.map((value, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  textAlign: "center",
                }}
              >
                <div
                  title={`${i + 1}: ${rupees(value)}`}
                  style={{
                    height: `${(value / maxDaily) * 175}px`,
                    background: "#62947d",
                    borderRadius: "5px 5px 0 0",
                  }}
                />
                <small>{i + 1}</small>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={panelStyle}>
        <h3>Category Analysis</h3>
        {categoryTotals.map((c) => (
          <div key={c.name} style={{ margin: "14px 0" }}>
            <p>
              {c.name} — {rupees(c.amount)}
            </p>
            <div
              style={{
                background: "#e5eee8",
                borderRadius: 10,
                height: 9,
              }}
            >
              <div
                style={{
                  width: `${(c.amount / total) * 100}%`,
                  background: "#62947d",
                  borderRadius: 10,
                  height: "100%",
                }}
              />
            </div>
          </div>
        ))}
        {items.length === 0 && <p>No expenses added yet.</p>}
      </div>

      <div style={panelStyle}>
        <h3>Spending Summary</h3>
        <p>Essential: {rupees(essential)}</p>
        <p>Optional / Review: {rupees(optional)}</p>
        <p>
          Optional Spending: {total ? ((optional / total) * 100).toFixed(1) : 0}
          %
        </p>
        <p>Highest Category: {categoryTotals[0]?.name || "No data"}</p>
        <small>
          Optional expenses are not necessarily wasteful. Review your purchases
          based on your priorities.
        </small>
      </div>

      <div style={panelStyle}>
        <h3>Expense History</h3>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              padding: "12px 0",
              borderBottom: "1px solid #eee",
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <strong>
                {item.category} — {rupees(item.amount)}
              </strong>
              <p>
                {item.spent_on} · {item.note}
              </p>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() => {
                  setEditing(item.id);
                  setAmount(String(item.amount));
                  setCategory(item.category);
                  setType(item.expense_type);
                  setDate(item.spent_on);
                  setNote(item.note || "");
                }}
              >
                Edit
              </button>
              <button type="button" onClick={() => deleteExpense(item.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && <p style={{ color: "#c0392b" }}>{error}</p>}
    </div>
  );
}

function HabitTracker({ home, user, people, demo }) {
  const [habits, setHabits] = useState([]);
  const [checks, setChecks] = useState([]);
  const [title, setTitle] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const todayDate = isoDate();
  const earliestDate = addDays(todayDate, -59);
  const demoKey = `manalife-habits-${home?.id}`;

  async function loadHabits() {
    if (!home?.id) return;

    if (demo) {
      const saved = JSON.parse(
        localStorage.getItem(demoKey) || '{"habits":[],"checks":[]}',
      );
      setHabits(saved.habits);
      setChecks(saved.checks);
      return;
    }

    const { data: list, error: listError } = await supabase
      .from("habits")
      .select("*")
      .eq("household_id", home.id)
      .order("created_at");

    if (listError) throw listError;
    setHabits(list || []);

    const ids = (list || []).map((h) => h.id);

    if (!ids.length) {
      setChecks([]);
      return;
    }

    const { data: history, error: historyError } = await supabase
      .from("habit_checks")
      .select("habit_id,user_id,done_on")
      .in("habit_id", ids)
      .gte("done_on", earliestDate);

    if (historyError) throw historyError;
    setChecks(history || []);
  }

  useEffect(() => {
    loadHabits().catch((e) => setError(e.message));
  }, [home?.id, demo]);

  useEffect(() => {
    if (demo || !home?.id) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadHabits().catch((e) => console.warn(e.message));
      }
    }, 20000);

    return () => window.clearInterval(timer);
  }, [home?.id, demo]);

  function saveDemo(nextHabits, nextChecks) {
    setHabits(nextHabits);
    setChecks(nextChecks);

    localStorage.setItem(
      demoKey,
      JSON.stringify({
        habits: nextHabits,
        checks: nextChecks,
      }),
    );
  }

  async function saveHabit(e) {
    e.preventDefault();
    if (!title.trim()) return;

    setBusy(true);
    setError("");

    try {
      if (demo) {
        const next = editingId
          ? habits.map((h) =>
              h.id === editingId ? { ...h, title: title.trim() } : h,
            )
          : [
              ...habits,
              {
                id: uid(),
                household_id: home.id,
                title: title.trim(),
              },
            ];

        saveDemo(next, checks);
      } else {
        const result = editingId
          ? await supabase
              .from("habits")
              .update({ title: title.trim() })
              .eq("id", editingId)
              .eq("household_id", home.id)
          : await supabase.from("habits").insert({
              title: title.trim(),
              household_id: home.id,
              created_by: user.id,
            });

        if (result.error) throw result.error;
        await loadHabits();
      }

      setTitle("");
      setEditingId(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const myDone = (id, day) =>
    checks.some(
      (c) => c.habit_id === id && c.user_id === user.id && c.done_on === day,
    );

  async function toggleToday(id) {
    setBusy(true);
    setError("");

    try {
      const alreadyDone = myDone(id, todayDate);

      if (demo) {
        const next = alreadyDone
          ? checks.filter(
              (c) =>
                !(
                  c.habit_id === id &&
                  c.user_id === user.id &&
                  c.done_on === todayDate
                ),
            )
          : [
              ...checks,
              {
                habit_id: id,
                user_id: user.id,
                done_on: todayDate,
              },
            ];

        saveDemo(habits, next);
      } else {
        const result = alreadyDone
          ? await supabase
              .from("habit_checks")
              .delete()
              .eq("habit_id", id)
              .eq("user_id", user.id)
              .eq("done_on", todayDate)
          : await supabase.from("habit_checks").insert({
              habit_id: id,
              user_id: user.id,
              done_on: todayDate,
            });

        if (result.error) throw result.error;
        await loadHabits();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteHabit(id) {
    if (!window.confirm("Delete this habit and its history?")) return;

    setBusy(true);
    setError("");

    try {
      if (demo) {
        saveDemo(
          habits.filter((h) => h.id !== id),
          checks.filter((c) => c.habit_id !== id),
        );
      } else {
        const { error: dbError } = await supabase
          .from("habits")
          .delete()
          .eq("id", id)
          .eq("household_id", home.id);

        if (dbError) throw dbError;
        await loadHabits();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const box = {
    background: "white",
    border: "1px solid #e4eae4",
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
  };

  const monthStart = `${todayDate.slice(0, 7)}-01`;
  const daysSoFar = Number(todayDate.slice(-2));

  return (
    <>
      <SectionHeader
        eyebrow="DAILY ROUTINES"
        title="Habit Tracker"
        description="Build small routines together and track daily progress."
      />

      <div style={box}>
        <h3>{editingId ? "Edit habit" : "Add a daily habit"}</h3>

        <form
          onSubmit={saveHabit}
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Morning walk, read 20 minutes"
            required
            maxLength={100}
            style={{
              flex: "1 1 230px",
              padding: 12,
              border: "1px solid #dce6df",
              borderRadius: 10,
            }}
          />

          <button className="primary-btn" disabled={busy} type="submit">
            {editingId ? "Save changes" : "Add habit"}
          </button>

          {editingId && (
            <button
              type="button"
              className="outline-btn"
              onClick={() => {
                setEditingId(null);
                setTitle("");
              }}
            >
              Cancel
            </button>
          )}
        </form>
      </div>

      {habits.map((habit) => {
        const completedToday = myDone(habit.id, todayDate);

        const monthDone = checks.filter(
          (c) =>
            c.habit_id === habit.id &&
            c.user_id === user.id &&
            c.done_on >= monthStart &&
            c.done_on <= todayDate,
        ).length;

        const progress = Math.round((monthDone / daysSoFar) * 100);

        let cursor = completedToday ? todayDate : addDays(todayDate, -1);

        let streak = 0;

        while (streak < 59 && myDone(habit.id, cursor)) {
          streak++;
          cursor = addDays(cursor, -1);
        }

        const memberNames = checks
          .filter((c) => c.habit_id === habit.id && c.done_on === todayDate)
          .map(
            (c) =>
              people.find((p) => p.id === c.user_id)?.display_name || "Member",
          );

        return (
          <div key={habit.id} style={box}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 6px" }}>{habit.title}</h3>
                <p
                  style={{
                    fontSize: 13,
                    color: "#6f8578",
                  }}
                >
                  🔥 {streak}-day streak (last 60 days)
                  {" · "}
                  {monthDone}/{daysSoFar} days this month
                </p>
              </div>

              <button
                type="button"
                disabled={busy}
                className={completedToday ? "primary-btn" : "outline-btn"}
                onClick={() => toggleToday(habit.id)}
              >
                {completedToday ? "✓ Completed — Undo" : "Mark done today"}
              </button>
            </div>

            <div
              style={{
                height: 9,
                background: "#e8eee9",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: "#53866d",
                }}
              />
            </div>

            <p
              style={{
                fontSize: 12,
                color: "#718678",
                marginTop: 8,
              }}
            >
              My monthly progress: {progress}%
            </p>

            <div
              style={{
                display: "flex",
                gap: 7,
                margin: "14px 0",
                flexWrap: "wrap",
              }}
            >
              {Array.from({ length: 7 }, (_, i) =>
                addDays(todayDate, i - 6),
              ).map((day) => (
                <div
                  key={day}
                  title={day}
                  style={{
                    borderRadius: 10,
                    padding: "8px 10px",
                    background: myDone(habit.id, day) ? "#dcece2" : "#f3f5f2",
                    fontSize: 12,
                  }}
                >
                  {day.slice(-2)} {myDone(habit.id, day) ? "✓" : "–"}
                </div>
              ))}
            </div>

            <p
              style={{
                fontSize: 12,
                color: "#718678",
              }}
            >
              Completed today by:{" "}
              {memberNames.length ? memberNames.join(", ") : "Nobody yet"}
            </p>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 12,
              }}
            >
              <button
                type="button"
                className="outline-btn"
                onClick={() => {
                  setEditingId(habit.id);
                  setTitle(habit.title);
                }}
              >
                Edit
              </button>

              <button
                type="button"
                className="outline-btn"
                disabled={busy}
                onClick={() => deleteHabit(habit.id)}
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}

      {!habits.length && (
        <div style={box}>No habits yet. Add your first daily habit above.</div>
      )}

      {error && <p className="inline-message error">{error}</p>}

      <p className="footnote">
        Each family member marks their own daily progress. All household members
        can see completion status.
      </p>
    </>
  );
}

const MEAL_FOODS = {
  "Cooked Rice": [130, 2.7, 28.2, 0.3],
  "Cooked Dal": [116, 7, 19, 1.7],
  Idli: [128, 4.4, 24.2, 1.2],
  Chapati: [297, 9, 49, 7],
  "Boiled Potato": [87, 1.9, 20.1, 0.1],
  Tomato: [18, 0.9, 3.9, 0.2],
  Milk: [61, 3.2, 4.8, 3.3],
  Egg: [143, 13, 0.7, 9.5],
  Paneer: [265, 18.3, 1.2, 20.8],
  "Cooking Oil": [884, 0, 0, 100],
  "Custom Ingredient": [0, 0, 0, 0],
};

function MealPlanner({ home, user, demo = false }) {
  const today = isoDate();
  const monday = addDays(
    today,
    -((new Date(today + "T12:00:00").getDay() + 6) % 7),
  );

  const [week, setWeek] = useState(monday);
  const [selectedDate, setSelectedDate] = useState(today);
  const [mealType, setMealType] = useState("breakfast");
  const [showMealModal, setShowMealModal] = useState(false);
  const [meals, setMeals] = useState([]);
  const [mealName, setMealName] = useState("");
  const [servings, setServings] = useState(2);
  const [ingredients, setIngredients] = useState([]);
  const [food, setFood] = useState("Cooked Rice");
  const [foodName, setFoodName] = useState("Cooked Rice");
  const [grams, setGrams] = useState("100");
  const [values, setValues] = useState(MEAL_FOODS["Cooked Rice"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));

  const types = [
    "breakfast",
    "mid_morning",
    "lunch",
    "afternoon_snack",
    "evening_snack",
    "dinner",
    "bedtime_snack",
  ];

  const mealLabels = {
    breakfast: "Meal 1 · Breakfast",
    mid_morning: "Meal 2 · Mid-morning",
    lunch: "Meal 3 · Lunch",
    afternoon_snack: "Meal 4 · Afternoon snack",
    evening_snack: "Meal 5 · Evening snack",
    dinner: "Meal 6 · Dinner",
    bedtime_snack: "Meal 7 · Bedtime snack",
  };

  const demoKey = `manalife-meals-${home.id}`;

  const card = {
    background: "#fff",
    border: "1px solid #e3e9e4",
    borderRadius: 16,
    padding: 20,
    marginBottom: 18,
  };

  const inputStyle = {
    width: "100%",
    padding: 11,
    border: "1px solid #dce6df",
    borderRadius: 9,
    background: "#fff",
    color: "#2c4e41",
  };

  const weekButtonStyle = {
    padding: "11px 16px",
    borderRadius: "10px",
    border: "1px solid #dce6df",
    background: "#ffffff",
    color: "#365f50",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 3px 10px rgba(0, 0, 0, 0.04)",
    transition: "all 0.2s ease",
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
  };

  function nutrition(list) {
    return list.reduce(
      (total, item) => {
        const factor = Number(item.grams) / 100;
        return {
          kcal: total.kcal + factor * Number(item.kcal),
          protein: total.protein + factor * Number(item.protein),
          carbs: total.carbs + factor * Number(item.carbs),
          fat: total.fat + factor * Number(item.fat),
        };
      },
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }

  const round = (n) => Math.round(n * 10) / 10;
  const total = nutrition(ingredients);
  const perServing = Object.fromEntries(
    Object.entries(total).map(([key, val]) => [
      key,
      round(val / Number(servings || 1)),
    ]),
  );

  async function loadMeals() {
    if (demo) {
      const saved = JSON.parse(localStorage.getItem(demoKey) || "[]");
      setMeals(
        saved.filter(
          (m) => m.meal_date >= week && m.meal_date <= addDays(week, 6),
        ),
      );
      return;
    }

    const { data, error: dbError } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("household_id", home.id)
      .gte("meal_date", week)
      .lte("meal_date", addDays(week, 6))
      .order("meal_date");

    if (dbError) throw dbError;
    setMeals(data || []);
  }

  useEffect(() => {
    loadMeals().catch((e) => setError(e.message));
  }, [home.id, week, demo]);

  const selectedMeal = meals.find(
    (m) => m.meal_date === selectedDate && m.meal_type === mealType,
  );

  useEffect(() => {
    setMealName(selectedMeal?.meal_name || "");
    setServings(selectedMeal?.servings || 2);
    setIngredients(
      Array.isArray(selectedMeal?.nutrition_items)
        ? selectedMeal.nutrition_items
        : [],
    );
  }, [selectedDate, mealType, meals]);

  function selectFood(name) {
    setFood(name);
    setFoodName(name === "Custom Ingredient" ? "" : name);
    setValues([...MEAL_FOODS[name]]);
  }

  function addIngredient() {
    setError("");
    if (!foodName.trim() || !Number(grams) || Number(grams) <= 0) {
      setError("Enter ingredient name and valid quantity.");
      return;
    }

    if (values.some((v) => !Number.isFinite(Number(v)) || Number(v) < 0)) {
      setError("Nutrition values must be valid non-negative numbers.");
      return;
    }

    setIngredients((old) => [
      ...old,
      {
        id: uid(),
        name: foodName.trim(),
        grams: Number(grams),
        kcal: Number(values[0]),
        protein: Number(values[1]),
        carbs: Number(values[2]),
        fat: Number(values[3]),
      },
    ]);
    setGrams("100");
  }

  async function saveMeal() {
    setError("");
    setMessage("");

    if (!mealName.trim()) {
      setError("Enter the meal name.");
      return;
    }

    if (
      !Number.isInteger(Number(servings)) ||
      Number(servings) < 1 ||
      Number(servings) > 20
    ) {
      setError("Servings must be between 1 and 20.");
      return;
    }

    setBusy(true);

    try {
      const payload = {
        meal_date: selectedDate,
        meal_type: mealType,
        meal_name: mealName.trim(),
        servings: Number(servings),
        ingredients: ingredients.map((i) => `${i.name} ${i.grams}g`).join(", "),
        nutrition_items: ingredients,
      };

      if (demo) {
        const saved = JSON.parse(localStorage.getItem(demoKey) || "[]");
        const other = saved.filter(
          (m) => !(m.meal_date === selectedDate && m.meal_type === mealType),
        );
        localStorage.setItem(
          demoKey,
          JSON.stringify([
            ...other,
            {
              ...payload,
              id: selectedMeal?.id || uid(),
              household_id: home.id,
            },
          ]),
        );
      } else {
        const result = selectedMeal
          ? await supabase
              .from("meal_plans")
              .update(payload)
              .eq("id", selectedMeal.id)
              .eq("household_id", home.id)
          : await supabase.from("meal_plans").insert({
              ...payload,
              household_id: home.id,
              created_by: user.id,
            });

        if (result.error) throw result.error;
      }

      await loadMeals();
      setMessage("Meal saved successfully!");
      setShowMealModal(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteMeal() {
    if (!selectedMeal || !window.confirm("Delete this meal?")) return;
    setBusy(true);
    setError("");

    try {
      if (demo) {
        const saved = JSON.parse(localStorage.getItem(demoKey) || "[]");
        localStorage.setItem(
          demoKey,
          JSON.stringify(saved.filter((m) => m.id !== selectedMeal.id)),
        );
      } else {
        const { error: dbError } = await supabase
          .from("meal_plans")
          .delete()
          .eq("id", selectedMeal.id)
          .eq("household_id", home.id);

        if (dbError) throw dbError;
      }

      await loadMeals();
      setMessage("Meal deleted.");
      setShowMealModal(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function addToGroceries() {
    setError("");
    setMessage("");

    if (demo) {
      setError("Grocery integration requires Supabase login.");
      return;
    }

    if (!selectedMeal) {
      setError("Save the meal first.");
      return;
    }

    if (!selectedMeal.nutrition_items?.length) {
      setError("No ingredients to add.");
      return;
    }

    setBusy(true);

    try {
      const { data: existing, error: readError } = await supabase
        .from("groceries")
        .select("name")
        .eq("household_id", home.id)
        .eq("checked", false);

      if (readError) throw readError;

      const names = new Set((existing || []).map((x) => x.name.toLowerCase()));

      const newItems = [];

      for (const item of selectedMeal.nutrition_items) {
        const key = item.name.toLowerCase();

        if (!names.has(key)) {
          newItems.push({
            household_id: home.id,
            added_by: user.id,
            name: item.name,
            quantity: `${item.grams} g`,
            checked: false,
          });
          names.add(key);
        }
      }

      if (!newItems.length) {
        setMessage("Ingredients already in your shopping list.");
        return;
      }

      const { error: insertError } = await supabase
        .from("groceries")
        .insert(newItems);

      if (insertError) throw insertError;

      setMessage(`${newItems.length} ingredients added to groceries.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function changeWeek(offset) {
    const next = addDays(week, offset);
    setWeek(next);
    setSelectedDate(next);
  }

  const dailyCalories = days.map((day) =>
    meals
      .filter((m) => m.meal_date === day)
      .reduce(
        (sum, m) =>
          sum +
          nutrition(m.nutrition_items || []).kcal /
            Math.max(1, Number(m.servings || 1)),
        0,
      ),
  );

  const maxCalories = Math.max(1, ...dailyCalories);

  return (
    <>
      <SectionHeader
        eyebrow="FAMILY KITCHEN"
        title="Meal Planner"
        description="Plan meals, ingredients and daily nutrition."
      />

      <div style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <h3>Weekly Meal Planner</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              style={weekButtonStyle}
              onClick={() => changeWeek(-7)}
            >
              ← Previous
            </button>

            <button
              type="button"
              style={{
                ...weekButtonStyle,
                background: "#496f64",
                color: "#ffffff",
                borderColor: "#496f64",
              }}
              onClick={() => {
                setWeek(monday);
                setSelectedDate(today);
              }}
            >
              This Week
            </button>

            <button
              type="button"
              style={weekButtonStyle}
              onClick={() => changeWeek(7)}
            >
              Next →
            </button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "105px repeat(7, minmax(145px, 1fr))",
              gap: 8,
              minWidth: 1240,
              marginTop: 16,
            }}
          >
            <strong>Day</strong>
            {types.map((t) => (
              <strong key={t} style={{ textTransform: "capitalize" }}>
                {mealLabels[t]}
              </strong>
            ))}

            {days.map((day) => (
              <React.Fragment key={day}>
                <strong style={{ fontSize: 13, paddingTop: 15 }}>
                  {dateLabel(day, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </strong>

                {types.map((t) => {
                  const meal = meals.find(
                    (m) => m.meal_date === day && m.meal_type === t,
                  );

                  const active = selectedDate === day && mealType === t;

                  return (
                    <button
                      type="button"
                      key={t}
                      onClick={() => {
                        setSelectedDate(day);
                        setMealType(t);
                        setError("");
                        setShowMealModal(true);
                      }}
                      style={{
                        minHeight: 65,
                        textAlign: "left",
                        padding: 12,
                        background: active ? "#deede4" : "#f7f9f6",
                        border: active
                          ? "2px solid #4f8067"
                          : "1px solid #e2eae3",
                        borderRadius: 12,
                        color: "#284c3c",
                      }}
                    >
                      {meal?.meal_name || "+ Add meal"}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {showMealModal && (
        <div
          onClick={() => setShowMealModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(18, 40, 32, 0.6)",
            zIndex: 9998,
          }}
        />
      )}

      <div
        role="dialog"
        aria-modal={showMealModal}
        aria-label="Meal Planner Editor"
        style={{
          ...card,
          display: showMealModal ? "block" : "none",
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(900px, 94vw)",
          maxHeight: "90vh",
          overflowY: "auto",
          zIndex: 9999,
          margin: 0,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        <button
          type="button"
          onClick={() => setShowMealModal(false)}
          style={{
            padding: "10px 16px",
            borderRadius: 9,
            border: "1px solid #dce6df",
            background: "#ffffff",
            color: "#496f64",
            cursor: "pointer",
            float: "right",
          }}
        >
          ✕ Close
        </button>

        <h3>{selectedMeal ? "Edit Meal" : "Add Meal"}</h3>

        <div style={gridStyle}>
          <label>
            Select Date
            <input
              type="date"
              style={inputStyle}
              value={selectedDate}
              min={week}
              max={addDays(week, 6)}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </label>

          <label>
            Select Meal
            <select
              style={inputStyle}
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {mealLabels[t]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={gridStyle}>
          <label>
            Meal name
            <input
              style={inputStyle}
              value={mealName}
              placeholder="e.g. Rice and Dal"
              maxLength={150}
              onChange={(e) => setMealName(e.target.value)}
            />
          </label>

          <label>
            Servings
            <input
              type="number"
              style={inputStyle}
              min="1"
              max="20"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
            />
          </label>
        </div>

        <h3 style={{ marginTop: 24 }}>Add Ingredients</h3>

        <div style={gridStyle}>
          <label>
            Choose ingredient
            <select
              style={inputStyle}
              value={food}
              onChange={(e) => selectFood(e.target.value)}
            >
              {Object.keys(MEAL_FOODS).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ingredient name
            <input
              style={inputStyle}
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
            />
          </label>

          <label>
            Quantity (grams)
            <input
              type="number"
              style={inputStyle}
              min="0.01"
              step="0.01"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
            />
          </label>
        </div>

        <p style={{ fontSize: 12, color: "#738678" }}>
          Nutrition values per 100 g — editable estimates.
        </p>

        <div style={gridStyle}>
          {["Calories", "Protein", "Carbs", "Fat"].map((label, i) => (
            <label key={label}>
              {label} {i === 0 ? "(kcal)" : "(g)"}
              <input
                type="number"
                min="0"
                step="any"
                style={inputStyle}
                value={values[i]}
                onChange={(e) => {
                  const next = [...values];
                  next[i] = e.target.value;
                  setValues(next);
                }}
              />
            </label>
          ))}
        </div>

        <button
          type="button"
          className="outline-btn"
          style={{ marginTop: 16 }}
          onClick={addIngredient}
        >
          + Add Ingredient
        </button>

        <div style={{ marginTop: 18 }}>
          {ingredients.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: "10px 0",
                borderBottom: "1px solid #edf1ec",
              }}
            >
              <span>
                {item.name} — {item.grams} g{" · "}
                {round((item.grams * item.kcal) / 100)} kcal
              </span>
              <button
                type="button"
                onClick={() =>
                  setIngredients((old) => old.filter((x) => x.id !== item.id))
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <h3 style={{ marginTop: 24 }}>Nutrition Summary</h3>

        <div style={gridStyle}>
          {[
            ["Calories", "kcal"],
            ["Protein", "g"],
            ["Carbs", "g"],
            ["Fat", "g"],
          ].map(([name, unit]) => {
            const key =
              name.toLowerCase() === "calories" ? "kcal" : name.toLowerCase();

            return (
              <div
                key={name}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "#f3f7f3",
                }}
              >
                <small>{name}</small>
                <h2>
                  {round(total[key])} {unit}
                </h2>
                <small>
                  Per serving: {perServing[key]} {unit}
                </small>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 20,
          }}
        >
          <button
            type="button"
            className="primary-btn"
            onClick={saveMeal}
            disabled={busy}
          >
            {busy ? "Saving..." : "Save Meal"}
          </button>

          {selectedMeal && (
            <>
              <button
                type="button"
                className="outline-btn"
                onClick={deleteMeal}
                disabled={busy}
              >
                Delete Meal
              </button>

              <button
                type="button"
                className="outline-btn"
                onClick={addToGroceries}
                disabled={busy}
              >
                Add Ingredients to Groceries
              </button>
            </>
          )}
        </div>
      </div>

      <div style={card}>
        <h3>Weekly Calorie Chart</h3>
        <p style={{ fontSize: 12, color: "#738678" }}>
          Estimated calories for one serving of each planned meal.
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 12,
            height: 210,
            marginTop: 20,
          }}
        >
          {dailyCalories.map((value, i) => (
            <div
              key={days[i]}
              style={{
                flex: 1,
                minWidth: 0,
                textAlign: "center",
              }}
            >
              <small>{Math.round(value)}</small>
              <div
                style={{
                  height: `${Math.max(4, (value / maxCalories) * 150)}px`,
                  background: "#689980",
                  borderRadius: "6px 6px 0 0",
                }}
              />
              <small>{dateLabel(days[i], { weekday: "short" })}</small>
            </div>
          ))}
        </div>
      </div>

      {error && <p style={{ color: "#bc3b3b" }}>{error}</p>}
      {message && <p style={{ color: "#387458" }}>{message}</p>}

      <p className="footnote">
        Nutrition values are estimates, not lab-tested results. Cooking methods
        and ingredients can change actual values.
      </p>
    </>
  );
}
function MedicineTracker({ user, demo = false }) {
  const today = isoDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [medicines, setMedicines] = useState([]);
  const [dayLogs, setDayLogs] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const blankMedicine = () => ({
    name: "",
    dose_label: "",
    schedule_times: ["08:00"],
    start_date: today,
    end_date: "",
    refill_on: "",
    instructions: "",
    is_active: true,
  });
  const [form, setForm] = useState(blankMedicine);

  const card = {
    background: "#fff",
    border: "1px solid #e0e9e2",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  };
  const input = {
    display: "block",
    width: "100%",
    padding: 11,
    border: "1px solid #dce6df",
    borderRadius: 9,
    background: "#fff",
    color: "#294c3e",
    boxSizing: "border-box",
    marginTop: 6,
  };
  const greenButton = {
    padding: "10px 14px",
    background: "#496f64",
    color: "#fff",
    border: "none",
    borderRadius: 9,
    cursor: "pointer",
    fontWeight: 600,
  };
  const outlineButton = {
    ...greenButton,
    background: "#fff",
    color: "#496f64",
    border: "1px solid #d8e5dc",
  };

  const timeLabel = (value) => {
    const [hour, minute] = String(value).slice(0, 5).split(":").map(Number);
    return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
  };

  async function loadMedicineData() {
    if (demo || !user?.id) return;

    const [medResult, dayResult, historyResult] = await Promise.all([
      supabase
        .from("medications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("medicine_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("dose_date", selectedDate),
      supabase
        .from("medicine_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("dose_date", { ascending: false })
        .order("marked_at", { ascending: false })
        .limit(30),
    ]);

    if (medResult.error) throw medResult.error;
    if (dayResult.error) throw dayResult.error;
    if (historyResult.error) throw historyResult.error;

    setMedicines(medResult.data || []);
    setDayLogs(dayResult.data || []);
    setRecentLogs(historyResult.data || []);
  }

  useEffect(() => {
    setError("");
    setMedicines([]);
    setDayLogs([]);
    setRecentLogs([]);
    loadMedicineData().catch((err) => setError(err.message));
  }, [user?.id, demo, selectedDate]);

  function openAdd() {
    setEditingId(null);
    setForm(blankMedicine());
    setError("");
    setMessage("");
    setShowPopup(true);
  }

  function openEdit(medicine) {
    setEditingId(medicine.id);
    setForm({
      name: medicine.name,
      dose_label: medicine.dose_label || "",
      schedule_times: (medicine.schedule_times || ["08:00"]).map((t) =>
        String(t).slice(0, 5),
      ),
      start_date: medicine.start_date,
      end_date: medicine.end_date || "",
      refill_on: medicine.refill_on || "",
      instructions: medicine.instructions || "",
      is_active: medicine.is_active,
    });
    setError("");
    setMessage("");
    setShowPopup(true);
  }

  function changeTime(index, value) {
    setForm((previous) => ({
      ...previous,
      schedule_times: previous.schedule_times.map((time, i) =>
        i === index ? value : time,
      ),
    }));
  }

  function addTime() {
    setForm((previous) => {
      if (previous.schedule_times.length >= 8) return previous;
      const suggestions = [
        "13:00",
        "20:00",
        "22:00",
        "06:00",
        "10:00",
        "16:00",
        "18:00",
        "08:00",
      ];
      const next =
        suggestions.find((t) => !previous.schedule_times.includes(t)) ||
        "12:00";
      return {
        ...previous,
        schedule_times: [...previous.schedule_times, next],
      };
    });
  }

  async function saveMedicine(event) {
    event.preventDefault();
    setError("");

    const times = form.schedule_times.map((t) => t.trim());
    if (
      !form.name.trim() ||
      !form.start_date ||
      times.length < 1 ||
      times.length > 8 ||
      times.some((t) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) ||
      new Set(times).size !== times.length ||
      (form.end_date && form.end_date < form.start_date)
    ) {
      setError("Enter a medicine name, valid dates and 1–8 different times.");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        dose_label: form.dose_label.trim(),
        schedule_times: [...times].sort(),
        start_date: form.start_date,
        end_date: form.end_date || null,
        refill_on: form.refill_on || null,
        instructions: form.instructions.trim(),
        is_active: form.is_active,
      };
      const result = editingId
        ? await supabase
            .from("medications")
            .update(payload)
            .eq("id", editingId)
            .eq("user_id", user.id)
        : await supabase.from("medications").insert({
            ...payload,
            user_id: user.id,
          });
      if (result.error) throw result.error;
      await loadMedicineData();
      setShowPopup(false);
      setMessage(editingId ? "Medicine updated." : "Medicine added.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteMedicine(medicine) {
    if (
      !window.confirm(
        `Delete ${medicine.name} and its dose history permanently?`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const { error: dbError } = await supabase
        .from("medications")
        .delete()
        .eq("id", medicine.id)
        .eq("user_id", user.id);
      if (dbError) throw dbError;
      await loadMedicineData();
      setMessage("Medicine deleted.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function setDoseStatus(medicine, time, status) {
    if (busy || demo || !user?.id || selectedDate > today) return;
    setBusy(true);
    setError("");
    try {
      const result = status
        ? await supabase.from("medicine_logs").upsert(
            {
              medication_id: medicine.id,
              user_id: user.id,
              dose_date: selectedDate,
              dose_time: time,
              status,
              marked_at: new Date().toISOString(),
            },
            { onConflict: "medication_id,dose_date,dose_time" },
          )
        : await supabase
            .from("medicine_logs")
            .delete()
            .eq("medication_id", medicine.id)
            .eq("user_id", user.id)
            .eq("dose_date", selectedDate)
            .eq("dose_time", time);
      if (result.error) throw result.error;
      await loadMedicineData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const scheduled = medicines.filter(
    (med) =>
      med.is_active &&
      med.start_date <= selectedDate &&
      (!med.end_date || med.end_date >= selectedDate),
  );
  const doses = scheduled
    .flatMap((med) =>
      (med.schedule_times || []).map((time) => ({
        medicine: med,
        time: String(time).slice(0, 5),
      })),
    )
    .sort((a, b) => a.time.localeCompare(b.time));
  const logFor = (medicineId, time) =>
    dayLogs.find(
      (log) =>
        log.medication_id === medicineId &&
        String(log.dose_time).slice(0, 5) === time,
    );
  const takenCount = doses.filter(
    (dose) => logFor(dose.medicine.id, dose.time)?.status === "taken",
  ).length;
  const skippedCount = doses.filter(
    (dose) => logFor(dose.medicine.id, dose.time)?.status === "skipped",
  ).length;

  if (demo || !user?.id) {
    return (
      <>
        <SectionHeader
          eyebrow="PERSONAL HEALTH"
          title="Medicine Tracker"
          description="Private medication schedule and dose history."
        />
        <div style={card}>Sign in to manage your private medicine records.</div>
      </>
    );
  }

  return (
    <>
      <SectionHeader
        eyebrow="PERSONAL HEALTH"
        title="Medicine Tracker"
        description="Track prescribed medicines and mark each scheduled dose."
        right={
          <button type="button" style={greenButton} onClick={openAdd}>
            + Add Medicine
          </button>
        }
      />

      {error && !showPopup && (
        <p role="alert" style={{ color: "#bb3d3d" }}>
          {error}
        </p>
      )}
      {message && <p style={{ color: "#387458" }}>{message}</p>}

      <div
        style={{
          ...card,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "end",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <label>
          <strong>Schedule Date</strong>
          <input
            type="date"
            style={{ ...input, width: 190 }}
            max={today}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </label>
        <button
          type="button"
          style={outlineButton}
          onClick={() => setSelectedDate(today)}
        >
          Today
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        {[
          ["Scheduled", doses.length],
          ["Taken", takenCount],
          ["Skipped", skippedCount],
          ["Not logged", doses.length - takenCount - skippedCount],
        ].map(([label, value]) => (
          <div key={label} style={{ ...card, marginBottom: 0 }}>
            <p style={{ color: "#7b9184", fontSize: 12 }}>{label}</p>
            <h2 style={{ margin: "6px 0 0", color: "#365f50" }}>{value}</h2>
          </div>
        ))}
      </div>

      <div style={card}>
        <h3>
          {selectedDate === today ? "Today's Medicines" : "Medicine Schedule"}
        </h3>
        {!doses.length && <p>No active medicines scheduled for this date.</p>}
        {doses.map(({ medicine, time }) => {
          const status = logFor(medicine.id, time)?.status;
          return (
            <div
              key={`${medicine.id}-${time}`}
              style={{
                padding: "15px 0",
                borderBottom: "1px solid #edf0ec",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div>
                <strong>{medicine.name}</strong>
                <p style={{ fontSize: 13, color: "#748779" }}>
                  {timeLabel(time)}{" "}
                  {medicine.dose_label ? `· ${medicine.dose_label}` : ""}
                </p>
                {medicine.instructions && (
                  <p style={{ fontSize: 12 }}>{medicine.instructions}</p>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <strong
                  style={{
                    color:
                      status === "taken"
                        ? "#317353"
                        : status === "skipped"
                          ? "#ad7745"
                          : "#798d82",
                    fontSize: 12,
                  }}
                >
                  {status === "taken"
                    ? "Taken"
                    : status === "skipped"
                      ? "Skipped"
                      : "Not logged"}
                </strong>
                <button
                  type="button"
                  disabled={busy}
                  style={greenButton}
                  onClick={() => setDoseStatus(medicine, time, "taken")}
                >
                  Taken
                </button>
                <button
                  type="button"
                  disabled={busy}
                  style={outlineButton}
                  onClick={() => setDoseStatus(medicine, time, "skipped")}
                >
                  Skipped
                </button>
                {status && (
                  <button
                    type="button"
                    disabled={busy}
                    style={outlineButton}
                    onClick={() => setDoseStatus(medicine, time, null)}
                  >
                    Undo
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={card}>
        <h3>My Medicine List</h3>
        {!medicines.length && <p>No medicines added yet.</p>}
        {medicines.map((medicine) => (
          <div
            key={medicine.id}
            style={{
              borderBottom: "1px solid #edf0ec",
              padding: "14px 0",
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <strong>{medicine.name}</strong>
              <p style={{ fontSize: 12, color: "#748779" }}>
                {medicine.dose_label || "Dose not specified"} ·{" "}
                {medicine.schedule_times.map(timeLabel).join(", ")}
              </p>
              {medicine.refill_on && (
                <p style={{ fontSize: 12 }}>
                  Refill date: {dateLabel(medicine.refill_on)}
                </p>
              )}
              {!medicine.is_active && <p style={{ fontSize: 12 }}>Paused</p>}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                style={outlineButton}
                onClick={() => openEdit(medicine)}
              >
                Edit
              </button>
              <button
                type="button"
                style={outlineButton}
                disabled={busy}
                onClick={() => deleteMedicine(medicine)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={card}>
        <h3>Recent Dose History</h3>
        {!recentLogs.length && <p>No medicine doses logged yet.</p>}
        {recentLogs.map((log) => (
          <div
            key={log.id}
            style={{
              padding: "10px 0",
              borderBottom: "1px solid #edf0ec",
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span>
              {medicines.find((m) => m.id === log.medication_id)?.name ||
                "Medicine"}
              <span style={{ color: "#748779", fontSize: 12 }}>
                {` · ${dateLabel(log.dose_date)} · ${timeLabel(log.dose_time)}`}
              </span>
            </span>
            <strong
              style={{
                fontSize: 12,
                color: log.status === "taken" ? "#317353" : "#ad7745",
              }}
            >
              {log.status === "taken" ? "Taken" : "Skipped"}
            </strong>
          </div>
        ))}
      </div>

      {showPopup && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setShowPopup(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(18,40,32,0.6)",
            display: "grid",
            placeItems: "center",
            padding: 14,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Medicine editor"
            style={{
              ...card,
              width: "min(650px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              margin: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <h3>{editingId ? "Edit Medicine" : "Add Medicine"}</h3>
              <button
                type="button"
                style={outlineButton}
                disabled={busy}
                onClick={() => setShowPopup(false)}
              >
                ✕ Close
              </button>
            </div>
            <form onSubmit={saveMedicine}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 12,
                }}
              >
                <label>
                  Medicine Name *
                  <input
                    required
                    maxLength={150}
                    style={input}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Name from prescription"
                  />
                </label>
                <label>
                  Prescribed Dose
                  <input
                    maxLength={100}
                    style={input}
                    value={form.dose_label}
                    onChange={(e) =>
                      setForm({ ...form, dose_label: e.target.value })
                    }
                    placeholder="e.g. 1 tablet, as prescribed"
                  />
                </label>
                <label>
                  Start Date *
                  <input
                    type="date"
                    required
                    style={input}
                    value={form.start_date}
                    onChange={(e) =>
                      setForm({ ...form, start_date: e.target.value })
                    }
                  />
                </label>
                <label>
                  End Date (Optional)
                  <input
                    type="date"
                    min={form.start_date}
                    style={input}
                    value={form.end_date}
                    onChange={(e) =>
                      setForm({ ...form, end_date: e.target.value })
                    }
                  />
                </label>
                <label>
                  Refill Date (Optional)
                  <input
                    type="date"
                    style={input}
                    value={form.refill_on}
                    onChange={(e) =>
                      setForm({ ...form, refill_on: e.target.value })
                    }
                  />
                </label>
              </div>

              <h4 style={{ marginTop: 20 }}>Daily Medicine Times (up to 8)</h4>
              {form.schedule_times.map((time, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <input
                    type="time"
                    required
                    style={{ ...input, maxWidth: 190, marginTop: 0 }}
                    value={time}
                    onChange={(e) => changeTime(index, e.target.value)}
                  />
                  {form.schedule_times.length > 1 && (
                    <button
                      type="button"
                      style={outlineButton}
                      onClick={() =>
                        setForm((old) => ({
                          ...old,
                          schedule_times: old.schedule_times.filter(
                            (_, i) => i !== index,
                          ),
                        }))
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {form.schedule_times.length < 8 && (
                <button type="button" style={outlineButton} onClick={addTime}>
                  + Add Time
                </button>
              )}

              <label style={{ display: "block", marginTop: 16 }}>
                Instructions (Optional)
                <textarea
                  rows={3}
                  maxLength={500}
                  style={input}
                  value={form.instructions}
                  onChange={(e) =>
                    setForm({ ...form, instructions: e.target.value })
                  }
                  placeholder="Instructions provided by your clinician"
                />
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 16,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                />
                Active schedule
              </label>
              {error && (
                <p role="alert" style={{ color: "#bb3d3d" }}>
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                style={{
                  ...greenButton,
                  display: "block",
                  width: "100%",
                  marginTop: 20,
                }}
              >
                {busy
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Save Medicine"}
              </button>
            </form>
          </div>
        </div>
      )}

      <p style={{ color: "#849488", fontSize: 12 }}>
        This is a personal log, not a prescribing or alarm service. Use only the
        schedule provided by your clinician. A missed dose should not be doubled
        unless instructed.
      </p>
    </>
  );
}

async function loadRoomWorkspace(userId, preferredRoomId = null) {
  const { data: memberships, error: membershipError } = await supabase
    .from("household_members")
    .select("household_id,role")
    .eq("user_id", userId);

  if (membershipError) throw membershipError;

  if (!memberships?.length) {
    return { rooms: [], familyInfo: null };
  }

  const ids = [...new Set(memberships.map((m) => m.household_id))];

  const { data: households, error: roomsError } = await supabase
    .from("households")
    .select("id,name,created_by,room_type,enabled_modules,overview_modules")
    .in("id", ids);

  if (roomsError) throw roomsError;

  const rooms = (households || []).map((room) => ({
    ...room,
    role: memberships.find((m) => m.household_id === room.id)?.role || "member",
  }));

  const savedRoomId = window.localStorage.getItem(
    `manalife-active-room-${userId}`,
  );

  const selected =
    rooms.find((r) => r.id === preferredRoomId) ||
    rooms.find((r) => r.id === savedRoomId) ||
    rooms.find((r) => r.room_type === "family") ||
    rooms[0];

  if (!selected) {
    return { rooms: [], familyInfo: null };
  }

  const { data: memberRows, error: memberError } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", selected.id);

  if (memberError) throw memberError;

  const memberIds = (memberRows || []).map((m) => m.user_id);

  let profiles = [];

  if (memberIds.length) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id,display_name")
      .in("id", memberIds);

    if (error) throw error;
    profiles = data || [];
  }

  const names = new Map(profiles.map((p) => [p.id, p.display_name]));

  return {
    rooms,
    familyInfo: {
      household: selected,
      role: selected.role,
      people: memberIds.map((id) => ({
        id,
        display_name: names.get(id) || "Member",
      })),
    },
  };
}

function RoomSelector({ rooms, home, demo, onSelect, onCreated }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("friends");
  const [enabled, setEnabled] = useState([]);
  const [cards, setCards] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // These are room-shared modules; period/medicine tracking is always private.
  const modules = SECTIONS.filter(
    (s) => !["today", "settings", "periods", "medicines"].includes(s.key),
  );
  const presets = {
    family: [
      "tasks",
      "groceries",
      "bills",
      "expenses",
      "reminders",
      "habits",
      "meals",
      "documents",
      "calendar",
    ],
    friends: ["tasks", "bills", "expenses", "calendar"],
    office: ["tasks", "expenses", "reminders", "calendar"],
    custom: ["tasks"],
  };

  function chooseKind(nextKind) {
    const nextEnabled = presets[nextKind] || presets.custom;
    setKind(nextKind);
    setEnabled([...nextEnabled]);
    setCards(
      nextEnabled.filter((key) =>
        ["tasks", "groceries", "bills", "expenses", "calendar"].includes(key),
      ),
    );
  }

  function startCreate() {
    setName("");
    chooseKind("friends");
    setError("");
    setDropdownOpen(false);
    setCreateOpen(true);
  }

  function toggleEnabled(key, checked) {
    setEnabled((old) =>
      checked ? [...old, key] : old.filter((k) => k !== key),
    );
    if (!checked) setCards((old) => old.filter((k) => k !== key));
  }

  function toggleCard(key, checked) {
    setCards((old) => (checked ? [...old, key] : old.filter((k) => k !== key)));
  }

  async function createRoom(e) {
    e.preventDefault();
    setError("");
    if (demo) {
      setError("Sign in to create a real room.");
      return;
    }
    if (!name.trim() || enabled.length === 0) {
      setError("Enter a room name and select at least one feature.");
      return;
    }
    setSaving(true);
    try {
      const { data, error: createError } = await supabase.rpc("create_room", {
        p_name: name.trim(),
        p_room_type: kind,
        p_enabled: enabled,
        p_cards: cards,
      });
      if (createError) throw createError;
      if (!data) throw new Error("Room was not returned by Supabase.");
      setCreateOpen(false);
      onCreated(data);
    } catch (e) {
      setError(e.message || "Could not create room.");
    } finally {
      setSaving(false);
    }
  }

  const fieldStyle = {
    width: "100%",
    padding: 11,
    border: "1px solid #dce6df",
    borderRadius: 10,
    background: "#fff",
    color: "#284a3c",
  };

  return (
    <>
      <div style={{ position: "relative" }}>
        <button
          type="button"
          className="home-card"
          onClick={() => setDropdownOpen((old) => !old)}
          aria-expanded={dropdownOpen}
          style={{
            width: "100%",
            cursor: "pointer",
            textAlign: "left",
            font: "inherit",
          }}
        >
          <span className="home-avatar">
            <House size={19} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <strong
              style={{
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {home.name}
            </strong>
            <small>
              <span className="online-dot" /> {home.room_type || "family"} room
            </small>
          </span>
          <ChevronDown size={15} />
        </button>

        {dropdownOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              right: 0,
              zIndex: 60,
              background: "white",
              border: "1px solid #dce6df",
              borderRadius: 12,
              padding: 8,
              boxShadow: "0 14px 35px rgba(20,50,30,.16)",
            }}
          >
            <p
              style={{
                margin: "4px 8px 8px",
                fontSize: 11,
                color: "#82938a",
                letterSpacing: 1,
              }}
            >
              MY ROOMS
            </p>
            {rooms.map((room) => (
              <button
                type="button"
                key={room.id}
                onClick={() => {
                  setDropdownOpen(false);
                  onSelect(room.id);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "11px 10px",
                  marginBottom: 4,
                  borderRadius: 9,
                  border: "none",
                  cursor: "pointer",
                  background: room.id === home.id ? "#e5efe8" : "transparent",
                  color: "#345a49",
                }}
              >
                {room.id === home.id ? "✓ " : ""}
                {room.name}
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    opacity: 0.7,
                    marginTop: 2,
                  }}
                >
                  {room.room_type}
                </span>
              </button>
            ))}
            {!demo && (
              <button
                type="button"
                onClick={startCreate}
                style={{
                  width: "100%",
                  padding: 11,
                  border: "1px dashed #8da99a",
                  borderRadius: 9,
                  background: "#f7faf8",
                  color: "#496f64",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                + Create New Room
              </button>
            )}
          </div>
        )}
      </div>

      {createOpen &&
        createPortal(
          <div
            className="modal-backdrop"
            style={{ zIndex: 10050, padding: 14, overflowY: "auto" }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !saving) setCreateOpen(false);
            }}
          >
            <div
              className="modal-card"
              role="dialog"
              aria-modal="true"
              aria-label="Create room"
              style={{
                width: "min(640px, 100%)",
                maxHeight: "92vh",
                overflowY: "auto",
                margin: "auto",
              }}
            >
              <div className="modal-heading">
                <div>
                  <p className="eyebrow">CUSTOMIZE YOUR SPACE</p>
                  <h2>Create New Room</h2>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  title="Close"
                  onClick={() => setCreateOpen(false)}
                  disabled={saving}
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={createRoom} className="edit-form">
                <label className="field">
                  <span>Room Name</span>
                  <input
                    required
                    maxLength={100}
                    style={fieldStyle}
                    placeholder="e.g. College Friends"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Room Type</span>
                  <select
                    style={fieldStyle}
                    value={kind}
                    onChange={(e) => chooseKind(e.target.value)}
                  >
                    <option value="family">Family</option>
                    <option value="friends">Friends / Roommates</option>
                    <option value="office">Office Colleagues</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>

                <h3 style={{ margin: "14px 0 4px" }}>Choose Room Features</h3>
                <p style={{ color: "#7b8d81", fontSize: 12, marginTop: 0 }}>
                  Select features for the sidebar. Tick “Overview” to show its
                  clickable card on the dashboard.
                </p>
                <div style={{ display: "grid", gap: 7, margin: "10px 0" }}>
                  {modules.map((m) => (
                    <div
                      key={m.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        flexWrap: "wrap",
                        padding: "10px 12px",
                        border: "1px solid #e1e9e2",
                        borderRadius: 10,
                        background: enabled.includes(m.key)
                          ? "#f3f8f4"
                          : "white",
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          gap: 9,
                          alignItems: "center",
                          flex: 1,
                          minWidth: 160,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={enabled.includes(m.key)}
                          onChange={(e) =>
                            toggleEnabled(m.key, e.target.checked)
                          }
                        />
                        <m.icon size={17} />
                        <span style={{ fontSize: 13 }}>{m.title}</span>
                      </label>
                      <label
                        style={{
                          display: "flex",
                          gap: 7,
                          alignItems: "center",
                          fontSize: 12,
                          color: "#617c6c",
                          cursor: enabled.includes(m.key)
                            ? "pointer"
                            : "not-allowed",
                        }}
                      >
                        <input
                          type="checkbox"
                          disabled={!enabled.includes(m.key)}
                          checked={cards.includes(m.key)}
                          onChange={(e) => toggleCard(m.key, e.target.checked)}
                        />
                        Overview
                      </label>
                    </div>
                  ))}
                </div>
                <p style={{ color: "#7b8d81", fontSize: 12 }}>
                  Period & Medicine Tracker are private personal sections, not
                  room-shared features.
                </p>
                {error && <p className="inline-message error">{error}</p>}
                <button
                  type="submit"
                  className="primary-btn full"
                  disabled={saving}
                >
                  {saving ? "Creating..." : "Create Room"}
                </button>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
function RoomSettingsPanel({ home, isOwner, demo, onSaved }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(home?.name || "");
  const [roomType, setRoomType] = useState(home?.room_type || "family");
  const [enabled, setEnabled] = useState(home?.enabled_modules || []);
  const [cards, setCards] = useState(home?.overview_modules || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Private health sections, Overview and Settings are NOT shared room modules.
  // Split Bills is excluded until that feature is implemented.
  const modules = SECTIONS.filter(
    (s) => !["today", "settings", "periods", "medicines"].includes(s.key),
  );

  useEffect(() => {
    setName(home?.name || "");
    setRoomType(home?.room_type || "family");
    setEnabled(
      Array.isArray(home?.enabled_modules) ? [...home.enabled_modules] : [],
    );
    setCards(
      Array.isArray(home?.overview_modules) ? [...home.overview_modules] : [],
    );
    setOpen(false);
    setError("");
    setSuccess("");
  }, [home?.id]);

  function openEditor() {
    setName(home.name);
    setRoomType(home.room_type || "family");
    setEnabled(
      Array.isArray(home.enabled_modules) ? [...home.enabled_modules] : [],
    );
    setCards(
      Array.isArray(home.overview_modules) ? [...home.overview_modules] : [],
    );
    setError("");
    setSuccess("");
    setOpen(true);
  }

  function toggleModule(key, checked) {
    setEnabled((old) =>
      checked ? [...new Set([...old, key])] : old.filter((x) => x !== key),
    );
    if (!checked) {
      setCards((old) => old.filter((x) => x !== key));
    }
  }

  function toggleCard(key, checked) {
    setCards((old) =>
      checked ? [...new Set([...old, key])] : old.filter((x) => x !== key),
    );
  }

  async function saveRoom(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (demo || !isOwner) {
      setError("Only the owner of this room can change its settings.");
      return;
    }
    if (!name.trim() || name.trim().length > 100) {
      setError("Room name must be 1 to 100 characters.");
      return;
    }
    if (enabled.length === 0) {
      setError("Select at least one room feature.");
      return;
    }
    setSaving(true);
    try {
      const { error: dbError } = await supabase.rpc(
        "update_room_configuration",
        {
          p_room: home.id,
          p_name: name.trim(),
          p_room_type: roomType,
          p_enabled: enabled,
          p_cards: cards.filter((key) => enabled.includes(key)),
        },
      );
      if (dbError) throw dbError;
      await onSaved(); // Refreshes rooms, active household and visible dashboard.
      setOpen(false);
      setSuccess("Room settings saved successfully!");
    } catch (err) {
      setError(err.message || "Could not update room settings.");
    } finally {
      setSaving(false);
    }
  }

  const fieldStyle = {
    width: "100%",
    padding: 11,
    border: "1px solid #dce6df",
    borderRadius: 10,
    background: "white",
    color: "#294f3f",
  };

  return (
    <>
      <div className="panel" style={{ marginBottom: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <h3 style={{ marginBottom: 7 }}>Customize This Room</h3>
            <p style={{ fontSize: 13, color: "#788e80" }}>
              Choose sidebar features and which cards appear on Overview.
            </p>
            <p style={{ fontSize: 12, color: "#788e80", marginTop: 6 }}>
              {home.name} · {home.room_type || "family"} ·{" "}
              {(home.enabled_modules || []).length} features
            </p>
          </div>
          {isOwner && !demo ? (
            <button type="button" className="primary-btn" onClick={openEditor}>
              Customize Room
            </button>
          ) : (
            <span style={{ fontSize: 12, color: "#718578" }}>
              Only room owner can edit
            </span>
          )}
        </div>
        {success && (
          <p
            className="inline-message"
            style={{ color: "#397455", marginTop: 12 }}
          >
            {success}
          </p>
        )}
      </div>

      {open &&
        createPortal(
          <div
            className="modal-backdrop"
            style={{ zIndex: 10100, padding: 14, overflowY: "auto" }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !saving) setOpen(false);
            }}
          >
            <div
              className="modal-card"
              role="dialog"
              aria-modal="true"
              aria-label="Customize room"
              style={{
                width: "min(660px, 100%)",
                maxHeight: "92vh",
                overflowY: "auto",
                margin: "auto",
              }}
            >
              <div className="modal-heading">
                <div>
                  <p className="eyebrow">ROOM SETTINGS</p>
                  <h2>Customize Room</h2>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  title="Close"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={saveRoom} className="edit-form">
                <label className="field">
                  <span>Room Name</span>
                  <input
                    style={fieldStyle}
                    required
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>

                <label className="field">
                  <span>Room Type</span>
                  <select
                    style={fieldStyle}
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                  >
                    <option value="family">Family</option>
                    <option value="friends">Friends / Roommates</option>
                    <option value="office">Office Colleagues</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>

                <h3 style={{ margin: "14px 0 4px" }}>Choose Room Features</h3>
                <p style={{ color: "#728779", fontSize: 12, margin: 0 }}>
                  Feature = show in sidebar. Overview = show as dashboard card.
                </p>
                <div style={{ display: "grid", gap: 8, margin: "12px 0" }}>
                  {modules.map((m) => {
                    const Icon = m.icon;
                    const checked = enabled.includes(m.key);
                    return (
                      <div
                        key={m.key}
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          gap: 12,
                          padding: "11px 12px",
                          background: checked ? "#f3f8f4" : "#fff",
                          border: "1px solid #e2e9e3",
                          borderRadius: 11,
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 9,
                            flex: 1,
                            minWidth: 160,
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              toggleModule(m.key, e.target.checked)
                            }
                          />
                          <Icon size={17} color="#496f64" />
                          <span style={{ fontSize: 13 }}>{m.title}</span>
                        </label>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                            fontSize: 12,
                            color: "#4e7964",
                            cursor: checked ? "pointer" : "not-allowed",
                          }}
                        >
                          <input
                            type="checkbox"
                            disabled={!checked}
                            checked={cards.includes(m.key)}
                            onChange={(e) =>
                              toggleCard(m.key, e.target.checked)
                            }
                          />
                          Overview Card
                        </label>
                      </div>
                    );
                  })}
                </div>

                <p style={{ color: "#788d7f", fontSize: 12 }}>
                  Overview and Settings always stay visible. Period & Medicine
                  Tracker are personal, not shared room features. Hiding a
                  feature does not delete its saved data.
                </p>
                {error && <p className="inline-message error">{error}</p>}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Room Settings"}
                  </button>
                  <button
                    type="button"
                    className="outline-btn"
                    disabled={saving}
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
function PeriodShareSettings({ home, user, people }) {
  const [viewerId, setViewerId] = useState("");
  const [shares, setShares] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const partners = (people || []).filter((p) => p.id !== user?.id);

  async function loadShares() {
    if (!home?.id || !user?.id) return;
    const { data, error: dbError } = await supabase
      .from("period_shares")
      .select("id,viewer_id,created_at")
      .eq("room_id", home.id)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    if (dbError) throw dbError;
    setShares(data || []);
  }

  useEffect(() => {
    setShares([]);
    setViewerId("");
    setError("");
    setNotice("");
    loadShares().catch((e) => setError(e.message));
  }, [home?.id, user?.id]);

  async function grantShare() {
    setError("");
    setNotice("");
    if (!partners.some((p) => p.id === viewerId)) {
      setError("Select your partner from this Couple Room.");
      return;
    }
    if (shares.some((s) => s.viewer_id === viewerId)) {
      setError("Permission is already active for this person.");
      return;
    }
    setBusy(true);
    try {
      const { error: dbError } = await supabase
        .from("period_shares")
        .insert({ room_id: home.id, owner_id: user.id, viewer_id: viewerId });
      if (dbError) throw dbError;
      await loadShares();
      setViewerId("");
      setNotice("Read-only permission granted.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function revokeShare(share) {
    if (!window.confirm("Stop sharing your period data with this partner?"))
      return;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const { error: dbError } = await supabase
        .from("period_shares")
        .delete()
        .eq("id", share.id)
        .eq("room_id", home.id)
        .eq("owner_id", user.id);
      if (dbError) throw dbError;
      await loadShares();
      setNotice("Access revoked. Future database reads are blocked.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel" style={{ marginTop: 18, marginBottom: 18 }}>
      <h3>Share Period Tracker with Partner</h3>
      <p style={{ fontSize: 13, color: "#708576" }}>
        Private by default. Choose one Couple Room member to grant read-only
        access. They cannot add, edit or delete your records.
      </p>
      <div
        style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}
      >
        <select
          value={viewerId}
          disabled={busy}
          onChange={(e) => setViewerId(e.target.value)}
          aria-label="Choose partner"
          style={{
            flex: "1 1 200px",
            padding: 11,
            borderRadius: 9,
            border: "1px solid #dce6df",
          }}
        >
          <option value="">Select partner</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name || "Member"}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="primary-btn"
          disabled={busy || !viewerId}
          onClick={grantShare}
        >
          Give View Permission
        </button>
      </div>
      {partners.length === 0 && (
        <p style={{ fontSize: 13 }}>
          Invite your partner into this Couple Room first.
        </p>
      )}
      {shares.map((share) => (
        <div
          key={share.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            padding: "12px 0",
            borderBottom: "1px solid #e6ece7",
          }}
        >
          <span>
            Shared with:{" "}
            {partners.find((p) => p.id === share.viewer_id)?.display_name ||
              "Partner"}
          </span>
          <button
            type="button"
            className="outline-btn"
            disabled={busy}
            onClick={() => revokeShare(share)}
          >
            Revoke Access
          </button>
        </div>
      ))}
      {error && <p style={{ color: "#b83d3d" }}>{error}</p>}
      {notice && <p style={{ color: "#397455" }}>{notice}</p>}
    </div>
  );
}

function PartnerPeriodViewer({ home, user, ownerIds, people }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chosenOwner, setChosenOwner] = useState("");

  const selectedOwner = ownerIds.includes(chosenOwner)
    ? chosenOwner
    : ownerIds[0];
  const name =
    people.find((p) => p.id === selectedOwner)?.display_name || "Partner";

  async function loadSharedEntries() {
    if (!selectedOwner) {
      setEntries([]);
      return;
    }
    const { data, error: dbError } = await supabase
      .from("period_entries")
      .select("start_date,end_date,flow,symptoms,notes")
      .eq("user_id", selectedOwner)
      .order("start_date", { ascending: false })
      .limit(24);
    if (dbError) throw dbError;
    setEntries(data || []);
  }

  useEffect(() => {
    let active = true;
    setEntries([]);
    setLoading(true);
    setError("");
    const load = async () => {
      try {
        if (!selectedOwner) return;
        const { data, error: dbError } = await supabase
          .from("period_entries")
          .select("start_date,end_date,flow,symptoms,notes")
          .eq("user_id", selectedOwner)
          .order("start_date", { ascending: false })
          .limit(24);
        if (dbError) throw dbError;
        if (active) setEntries(data || []);
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [home?.id, user?.id, selectedOwner]);

  const cycleGaps = entries
    .slice(0, -1)
    .map((e, i) =>
      Math.round(
        (new Date(e.start_date + "T12:00:00Z") -
          new Date(entries[i + 1].start_date + "T12:00:00Z")) /
          86400000,
      ),
    )
    .filter((n) => n >= 15 && n <= 90);
  const averageCycle = cycleGaps.length
    ? Math.round(cycleGaps.reduce((a, b) => a + b, 0) / cycleGaps.length)
    : null;
  const expected =
    averageCycle && entries[0]
      ? addDays(entries[0].start_date, averageCycle)
      : null;

  return (
    <>
      <SectionHeader
        eyebrow="COUPLE ROOM · READ ONLY"
        title={`${name}'s Period Tracker`}
        description="Shared with your partner's permission. You can view, not edit."
      />
      {ownerIds.length > 1 && (
        <label className="field">
          <span>Choose partner</span>
          <select
            value={selectedOwner || ""}
            onChange={(e) => setChosenOwner(e.target.value)}
          >
            {ownerIds.map((id) => (
              <option key={id} value={id}>
                {people.find((p) => p.id === id)?.display_name || "Partner"}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="panel" style={{ marginBottom: 16 }}>
        <h3>Expected Next Period</h3>
        <p>
          {expected
            ? dateLabel(expected) + " (estimate only)"
            : "Need at least 2 period starts"}
        </p>
        <small>
          Prediction is not reliable for contraception or pregnancy decisions.
        </small>
      </div>
      <div className="panel">
        <h3>Shared Period History</h3>
        {loading && <p>Loading...</p>}
        {!loading && !entries.length && !error && <p>No records shared yet.</p>}
        {entries.map((entry, i) => (
          <div
            key={`${entry.start_date}-${i}`}
            style={{ padding: "13px 0", borderBottom: "1px solid #e8eee9" }}
          >
            <strong>
              {dateLabel(entry.start_date)}
              {entry.end_date ? ` – ${dateLabel(entry.end_date)}` : ""}
            </strong>
            <p style={{ fontSize: 13, color: "#6f8177" }}>
              Flow: {entry.flow || "Not recorded"}
            </p>
            {!!entry.symptoms?.length && (
              <p style={{ fontSize: 13 }}>
                Symptoms: {entry.symptoms.join(", ")}
              </p>
            )}
            {entry.notes && <p style={{ fontSize: 13 }}>{entry.notes}</p>}
          </div>
        ))}
        {error && <p style={{ color: "#b83d3d" }}>{error}</p>}
        <button
          className="outline-btn"
          type="button"
          onClick={() => loadSharedEntries().catch((e) => setError(e.message))}
        >
          Refresh History
        </button>
      </div>
    </>
  );
}

function PersonalGenderSettings({ user, demo }) {
  const [gender, setGender] = useState(user?.user_metadata?.gender || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setGender(user?.user_metadata?.gender || "");
  }, [user?.id, user?.user_metadata?.gender]);

  async function saveGender() {
    if (demo || !user?.id || !gender) return;

    setBusy(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.updateUser({
        data: { gender },
      });

      if (error) throw error;

      setMessage("Gender preference saved successfully!");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel" style={{ marginBottom: 18 }}>
      <h3>My Personal Profile</h3>

      <p style={{ fontSize: 13, color: "#718578" }}>
        Choose your gender to personalize health features.
      </p>

      <label className="field">
        <span>Gender</span>

        <select
          value={gender}
          disabled={demo}
          onChange={(e) => setGender(e.target.value)}
        >
          <option value="">Select Gender</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </select>
      </label>

      <button
        type="button"
        className="primary-btn"
        onClick={saveGender}
        disabled={busy || demo || !gender}
        style={{ marginTop: 14 }}
      >
        {busy ? "Saving..." : "Save Profile"}
      </button>

      {message && <p style={{ marginTop: 10 }}>{message}</p>}
    </div>
  );
}

function LeaveRoomPanel({ home, isOwner, demo, user }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function leaveRoom() {
    if (demo || isOwner || !home?.id || !user?.id) return;

    const confirmed = window.confirm(
      `Leave "${home.name}"?\n\n` +
        "You will lose access to this room's shared data. " +
        "Other members and their data will remain.",
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");

    try {
      const { error: dbError } = await supabase.rpc("leave_room", {
        p_room: home.id,
      });

      if (dbError) throw dbError;

      window.localStorage.removeItem(`manalife-active-room-${user.id}`);

      window.location.reload();
    } catch (err) {
      setError(err.message || "Could not leave room.");
      setBusy(false);
    }
  }

  return (
    <div className="panel" style={{ marginBottom: 18 }}>
      <h3>Room Management</h3>

      <p style={{ fontSize: 13, color: "#718578" }}>
        Manage your membership in {home.name}.
      </p>

      {isOwner ? (
        <p style={{ fontSize: 13, color: "#718578" }}>
          You are the Room Owner. To leave, first transfer ownership to another
          member.
        </p>
      ) : (
        <button
          type="button"
          disabled={busy || demo}
          onClick={leaveRoom}
          style={{
            padding: "11px 17px",
            borderRadius: 10,
            border: "1px solid #e8bbbb",
            background: "#fff4f4",
            color: "#b23c3c",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {busy ? "Leaving..." : "Leave Room"}
        </button>
      )}

      {error && <p style={{ color: "#b23c3c", marginTop: 10 }}>{error}</p>}
    </div>
  );
}
function RoomOwnershipPanel({
  home,
  user,
  people = [],
  isOwner,
  demo,
  onChanged,
}) {
  const [newOwnerId, setNewOwnerId] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const candidates = people.filter((person) => person.id !== user?.id);

  useEffect(() => {
    setNewOwnerId("");
    setConfirmName("");
    setError("");
    setMessage("");
  }, [home?.id]);

  const fieldStyle = {
    width: "100%",
    maxWidth: 460,
    padding: 11,
    border: "1px solid #dce6df",
    borderRadius: 10,
    background: "white",
    color: "#294f3f",
  };

  async function transferOwnership() {
    if (!home?.id || !user?.id || demo || !isOwner || !newOwnerId || working)
      return;

    const selectedPerson = candidates.find(
      (person) => person.id === newOwnerId,
    );
    if (!selectedPerson) return;

    const confirmed = window.confirm(
      `Transfer ownership of "${home.name}" to ${selectedPerson.display_name || "this member"}?\n\n` +
        "You will become a regular member. The new owner can manage or delete the room.",
    );
    if (!confirmed) return;

    setWorking("transfer");
    setError("");
    setMessage("");

    try {
      const { error: dbError } = await supabase.rpc("transfer_room_ownership", {
        p_room: home.id,
        p_new_owner: newOwnerId,
      });
      if (dbError) throw dbError;

      setNewOwnerId("");
      await onChanged();
      setMessage("Ownership transferred. You are now a regular member.");
    } catch (err) {
      setError(err.message || "Could not transfer ownership.");
    } finally {
      setWorking("");
    }
  }

  async function deleteRoom() {
    if (!home?.id || !user?.id || demo || !isOwner || working) return;
    if (confirmName !== home.name) {
      setError("Select the room to confirm deletion.");
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete "${home.name}"?\n\n` +
        "This deletes the room and its shared data for ALL members. This cannot be undone.",
    );
    if (!confirmed) return;

    setWorking("delete");
    setError("");
    setMessage("");

    try {
      const { error: dbError } = await supabase.rpc("delete_room_safely", {
        p_room: home.id,
        p_confirm_name: confirmName,
      });
      if (dbError) throw dbError;

      window.localStorage.removeItem(`manalife-active-room-${user.id}`);
      setConfirmName("");
      await onChanged();
    } catch (err) {
      setError(err.message || "Could not delete room.");
    } finally {
      setWorking("");
    }
  }

  if (demo || !isOwner) return null;

  return (
    <div className="panel" style={{ marginBottom: 18 }}>
      <h3>Room Ownership &amp; Deletion</h3>
      <p style={{ color: "#718578", fontSize: 13 }}>
        Only the current room owner can perform these actions.
      </p>

      <div style={{ padding: "16px 0", borderBottom: "1px solid #e9eeea" }}>
        <h4 style={{ marginBottom: 8 }}>Transfer Ownership</h4>
        <p style={{ fontSize: 13, color: "#718578" }}>
          Give ownership to an existing room member. You will stay as a regular
          member and can use Leave Room afterwards.
        </p>

        {candidates.length ? (
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <select
              aria-label="New room owner"
              style={fieldStyle}
              value={newOwnerId}
              onChange={(e) => setNewOwnerId(e.target.value)}
              disabled={!!working}
            >
              <option value="">Select new owner</option>
              {candidates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name || "Member"}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="primary-btn"
              onClick={transferOwnership}
              disabled={!newOwnerId || !!working}
            >
              {working === "transfer"
                ? "Transferring..."
                : "Transfer Ownership"}
            </button>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "#718578" }}>
            No other members in this room. Invite a member before transferring
            ownership.
          </p>
        )}
      </div>

      <div style={{ paddingTop: 16 }}>
        <h4 style={{ marginBottom: 8, color: "#a53737" }}>
          Delete Room Permanently
        </h4>
        <p style={{ fontSize: 13, color: "#8f4b4b" }}>
          All room-shared records will be deleted. Period/Medicine Tracker
          personal records are not automatically deleted. Remove any Family
          Documents files through the app or Supabase Storage API before
          deleting this room.
        </p>

        <label className="field" style={{ maxWidth: 460 }}>
          <span>Select Room to Delete</span>

          <select
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            style={fieldStyle}
            disabled={!!working}
          >
            <option value="">Select Room</option>
            <option value={home.name}>{home.name}</option>
          </select>
        </label>

        <button
          type="button"
          onClick={deleteRoom}
          disabled={confirmName !== home.name || !!working}
          style={{
            marginTop: 12,
            padding: "11px 16px",
            border: "1px solid #d6aaaa",
            borderRadius: 10,
            background: confirmName === home.name ? "#a53737" : "#f9eeee",
            color: confirmName === home.name ? "white" : "#a53737",
            fontWeight: 700,
            cursor: confirmName === home.name ? "pointer" : "not-allowed",
          }}
        >
          {working === "delete" ? "Deleting..." : "Delete Room Permanently"}
        </button>
      </div>

      {error && (
        <p className="inline-message error" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
      {message && <p style={{ color: "#367653", fontSize: 13 }}>{message}</p>}
    </div>
  );
}
function App() {
  function PeriodTracker({ user, demo = false }) {
    const today = isoDate();

    const blankForm = () => ({
      start_date: today,
      end_date: "",
      flow: "",
      symptoms: [],
      notes: "",
    });

    const [entries, setEntries] = useState([]);
    const [month, setMonth] = useState(today.slice(0, 7));
    const [form, setForm] = useState(blankForm);
    const [editingId, setEditingId] = useState(null);
    const [showPopup, setShowPopup] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const symptomsList = [
      "Cramps",
      "Headache",
      "Back pain",
      "Bloating",
      "Fatigue",
      "Mood changes",
      "Breast tenderness",
      "Other",
    ];

    const card = {
      background: "#fff",
      border: "1px solid #e5e8e5",
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    };

    const input = {
      width: "100%",
      padding: 11,
      border: "1px solid #dce5df",
      borderRadius: 9,
      background: "#fff",
      color: "#304b40",
    };

    const button = {
      padding: "11px 16px",
      background: "#496f64",
      color: "white",
      border: "none",
      borderRadius: 9,
      cursor: "pointer",
    };

    const dayDifference = (a, b) =>
      Math.round(
        (new Date(b + "T12:00:00Z") - new Date(a + "T12:00:00Z")) / 86400000,
      );

    async function loadPeriods() {
      if (demo || !user?.id) return;

      const { data, error: dbError } = await supabase
        .from("period_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("start_date", { ascending: false });

      if (dbError) throw dbError;
      setEntries(data || []);
    }

    useEffect(() => {
      setEntries([]);
      if (!demo && user?.id) {
        loadPeriods().catch((e) => setError(e.message));
      }
    }, [user?.id, demo]);

    function openNew() {
      setForm(blankForm());
      setEditingId(null);
      setError("");
      setShowPopup(true);
    }

    function editPeriod(entry) {
      setEditingId(entry.id);
      setForm({
        start_date: entry.start_date,
        end_date: entry.end_date || "",
        flow: entry.flow || "",
        symptoms: entry.symptoms || [],
        notes: entry.notes || "",
      });
      setError("");
      setShowPopup(true);
    }

    async function savePeriod(e) {
      e.preventDefault();
      setError("");

      if (
        !form.start_date ||
        form.start_date > today ||
        (form.end_date &&
          (form.end_date < form.start_date || form.end_date > today))
      ) {
        setError("Please check the start and end dates.");
        return;
      }

      setBusy(true);

      try {
        const payload = {
          start_date: form.start_date,
          end_date: form.end_date || null,
          flow: form.flow || null,
          symptoms: form.symptoms,
          notes: form.notes.trim(),
        };

        const result = editingId
          ? await supabase
              .from("period_entries")
              .update(payload)
              .eq("id", editingId)
              .eq("user_id", user.id)
          : await supabase.from("period_entries").insert({
              ...payload,
              user_id: user.id,
            });

        if (result.error) throw result.error;

        await loadPeriods();
        setShowPopup(false);
        setEditingId(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    }

    async function deletePeriod(id) {
      if (!window.confirm("Delete this period record?")) return;

      setBusy(true);
      setError("");

      try {
        const { error: dbError } = await supabase
          .from("period_entries")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);

        if (dbError) throw dbError;
        await loadPeriods();
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    }

    const ordered = [...entries].sort((a, b) =>
      a.start_date.localeCompare(b.start_date),
    );

    const cycles = ordered.slice(1).map((entry, i) => ({
      date: entry.start_date,
      days: dayDifference(ordered[i].start_date, entry.start_date),
    }));

    const validCycles = cycles.filter((c) => c.days >= 15 && c.days <= 90);

    const averageCycle = validCycles.length
      ? Math.round(
          validCycles.reduce((s, c) => s + c.days, 0) / validCycles.length,
        )
      : null;

    const latestPeriod = ordered[ordered.length - 1];

    const expectedDate =
      averageCycle && latestPeriod
        ? addDays(latestPeriod.start_date, averageCycle)
        : null;

    const durations = entries
      .filter((e) => e.end_date)
      .map((e) => dayDifference(e.start_date, e.end_date) + 1);

    const averageDuration = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

    const [year, monthNumber] = month.split("-").map(Number);

    const daysInMonth = new Date(year, monthNumber, 0).getDate();

    const firstDayOffset =
      (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7;

    const calendarCells = [
      ...Array(firstDayOffset).fill(null),
      ...Array.from(
        { length: daysInMonth },
        (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
      ),
    ];

    const isPeriodDay = (day) =>
      entries.some(
        (e) => day >= e.start_date && day <= (e.end_date || e.start_date),
      );

    if (demo) {
      return (
        <>
          <SectionHeader
            eyebrow="PERSONAL HEALTH"
            title="Period Tracker"
            description="Private menstrual cycle tracking."
          />
          <div style={card}>Please sign in to save private period records.</div>
        </>
      );
    }

    return (
      <>
        <SectionHeader
          eyebrow="PERSONAL HEALTH"
          title="Period Tracker"
          description="Track your cycle, symptoms and history privately."
          right={
            <button type="button" style={button} onClick={openNew}>
              + Add Period
            </button>
          }
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          {[
            [
              "Next Expected Period",
              expectedDate ? dateLabel(expectedDate) : "Need more records",
            ],
            ["Average Cycle", averageCycle ? `${averageCycle} days` : "—"],
            [
              "Average Period Duration",
              averageDuration ? `${averageDuration} days` : "—",
            ],
          ].map(([label, value]) => (
            <div key={label} style={card}>
              <p style={{ color: "#82958a", fontSize: 12 }}>{label}</p>
              <h3 style={{ marginTop: 10 }}>{value}</h3>
            </div>
          ))}
        </div>

        <div style={card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <h3>Period Calendar</h3>

            <input
              type="month"
              style={{ ...input, width: 175 }}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: 7,
              marginTop: 18,
              textAlign: "center",
            }}
          >
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <strong key={day} style={{ fontSize: 12 }}>
                {day}
              </strong>
            ))}

            {calendarCells.map((day, i) => (
              <div
                key={day || `empty-${i}`}
                title={
                  day ? (isPeriodDay(day) ? "Logged period day" : day) : ""
                }
                style={{
                  minHeight: 42,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 10,
                  background: day
                    ? isPeriodDay(day)
                      ? "#f5ced9"
                      : day === today
                        ? "#e2ece5"
                        : "#f6f7f5"
                    : "transparent",
                  color: "#42584b",
                  fontSize: 13,
                  fontWeight: isPeriodDay(day) ? 700 : 400,
                }}
              >
                {day ? Number(day.slice(-2)) : ""}
              </div>
            ))}
          </div>

          <p style={{ color: "#819487", fontSize: 12 }}>
            Pink dates = recorded period days. Only dates you enter are
            highlighted.
          </p>
        </div>

        <div style={card}>
          <h3>Cycle Length History</h3>

          {validCycles.length === 0 ? (
            <p>Log at least two period start dates to see cycle trends.</p>
          ) : (
            validCycles.slice(-6).map((cycle) => (
              <div key={cycle.date} style={{ margin: "16px 0" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    marginBottom: 7,
                  }}
                >
                  <span>{dateLabel(cycle.date)}</span>
                  <strong>{cycle.days} days</strong>
                </div>
                <div
                  style={{
                    height: 12,
                    borderRadius: 10,
                    background: "#f1f1f1",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, (cycle.days / 90) * 100)}%`,
                      background: "#c889a1",
                      borderRadius: 10,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div style={card}>
          <h3>Period History</h3>

          {entries.length === 0 && (
            <p>No periods logged yet. Click Add Period to begin.</p>
          )}

          {entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                padding: "15px 0",
                borderBottom: "1px solid #e8eee9",
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <strong>
                  {dateLabel(entry.start_date)}
                  {entry.end_date && ` – ${dateLabel(entry.end_date)}`}
                </strong>

                <p style={{ fontSize: 12, color: "#789084" }}>
                  Flow: {entry.flow || "Not recorded"}
                </p>

                {!!entry.symptoms?.length && (
                  <p style={{ fontSize: 12 }}>{entry.symptoms.join(", ")}</p>
                )}

                {entry.notes && <p style={{ fontSize: 12 }}>{entry.notes}</p>}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => editPeriod(entry)}>
                  Edit
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => deletePeriod(entry.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {showPopup && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowPopup(false);
              }
            }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(20,35,28,0.6)",
              zIndex: 9999,
              display: "grid",
              placeItems: "center",
              padding: 15,
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Period entry"
              style={{
                ...card,
                width: "min(540px, 100%)",
                maxHeight: "90vh",
                overflowY: "auto",
                margin: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h2>{editingId ? "Edit Period" : "Add Period"}</h2>
                <button type="button" onClick={() => setShowPopup(false)}>
                  ✕
                </button>
              </div>

              <form onSubmit={savePeriod}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 12,
                  }}
                >
                  <label>
                    Start Date
                    <input
                      type="date"
                      required
                      max={today}
                      style={input}
                      value={form.start_date}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          start_date: e.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    End Date (Optional)
                    <input
                      type="date"
                      min={form.start_date}
                      max={today}
                      style={input}
                      value={form.end_date}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          end_date: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>

                <label
                  style={{
                    display: "block",
                    marginTop: 16,
                  }}
                >
                  Overall Flow
                  <select
                    style={input}
                    value={form.flow}
                    onChange={(e) => setForm({ ...form, flow: e.target.value })}
                  >
                    <option value="">Not recorded</option>
                    <option value="spotting">Spotting</option>
                    <option value="light">Light</option>
                    <option value="medium">Medium</option>
                    <option value="heavy">Heavy</option>
                  </select>
                </label>

                <h3 style={{ marginTop: 20 }}>Symptoms</h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginBottom: 18,
                  }}
                >
                  {symptomsList.map((symptom) => (
                    <label
                      key={symptom}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={form.symptoms.includes(symptom)}
                        onChange={(e) =>
                          setForm((old) => ({
                            ...old,
                            symptoms: e.target.checked
                              ? [...old.symptoms, symptom]
                              : old.symptoms.filter((s) => s !== symptom),
                          }))
                        }
                      />
                      {symptom}
                    </label>
                  ))}
                </div>

                <label>
                  Notes (Optional)
                  <textarea
                    rows={3}
                    maxLength={1000}
                    style={input}
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                  />
                </label>

                {error && <p style={{ color: "#bd4040" }}>{error}</p>}

                <button
                  type="submit"
                  disabled={busy}
                  style={{
                    ...button,
                    width: "100%",
                    marginTop: 20,
                  }}
                >
                  {busy ? "Saving..." : "Save Period"}
                </button>
              </form>
            </div>
          </div>
        )}

        {error && !showPopup && <p style={{ color: "#bd4040" }}>{error}</p>}

        <p style={{ fontSize: 12, color: "#87988d" }}>
          Private personal record. Cycle predictions are estimates, not medical
          advice or a reliable method of contraception.
        </p>
      </>
    );
  }

  const [demo, setDemo] = useState(false);
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [familyInfo, setFamilyInfo] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [rows, setRows] = useState(EMPTY);
  const [section, setSection] = useState("today");
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filter, setFilter] = useState("today");
  const [calMonth, setCalMonth] = useState(() => new Date(today + "T12:00:00"));
  const user = demo ? demoUser : session?.user;
  const home = demo ? demoFamily : familyInfo?.household;
  const people = demo ? demoPeople : familyInfo?.people || [];
  const role = demo ? "owner" : familyInfo?.role;
  const isOwner = role === "owner";

  const [periodAccess, setPeriodAccess] = useState({
    roomId: null,
    owners: [],
  });

  useEffect(() => {
    const roomId = home?.id;
    const userId = user?.id;

    if (
      demo ||
      !roomId ||
      !userId ||
      home?.room_type !== "family" ||
      user?.user_metadata?.gender !== "male"
    ) {
      setPeriodAccess({ roomId: null, owners: [] });
      return;
    }

    let active = true;

    async function checkPermission() {
      const { data, error } = await supabase
        .from("period_shares")
        .select("owner_id")
        .eq("room_id", roomId)
        .eq("viewer_id", userId);

      if (!active) return;

      const owners = error
        ? []
        : [...new Set((data || []).map((r) => r.owner_id))];

      setPeriodAccess((old) =>
        old.roomId === roomId &&
        old.owners.length === owners.length &&
        old.owners.every((id, i) => id === owners[i])
          ? old
          : { roomId, owners },
      );
    }

    checkPermission();

    const timer = window.setInterval(checkPermission, 15000);
    window.addEventListener("focus", checkPermission);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", checkPermission);
    };
  }, [demo, user?.id, user?.user_metadata?.gender, home?.id, home?.room_type]);

  const isCoupleRoom = home?.room_type === "family";

  const ownPeriodAccess =
    isCoupleRoom && user?.user_metadata?.gender === "female";

  const partnerCanViewPeriods =
    isCoupleRoom &&
    user?.user_metadata?.gender === "male" &&
    periodAccess.roomId === home?.id &&
    periodAccess.owners.length > 0;

  const canViewPeriods = ownPeriodAccess || partnerCanViewPeriods;

  const userName =
    people.find((p) => p.id === user?.id)?.display_name ||
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    "You";

  const alert = (message, kind = "ok") => {
    setNotice({ message, kind });
    window.setTimeout(() => setNotice(null), 5500);
  };

  const refresh = useCallback(
    async (userId, demoMode = demo) => {
      if (demoMode) {
        setRows(loadDemo());
        return;
      }

      if (!userId || !configured) {
        setRooms([]);
        setFamilyInfo(null);
        setRows(EMPTY);
        return;
      }

      const result = await loadRoomWorkspace(userId, activeRoomId);

      setRooms(result.rooms);
      setFamilyInfo(result.familyInfo);

      if (result.familyInfo?.household) {
        const roomId = result.familyInfo.household.id;

        setActiveRoomId(roomId);

        window.localStorage.setItem(`manalife-active-room-${userId}`, roomId);

        setRows(await loadRemote(roomId));
      } else {
        setActiveRoomId(null);
        setRows(EMPTY);
      }
    },
    [demo, activeRoomId],
  );

  useEffect(() => {
    if (!configured) {
      setBooting(false);
      return;
    }
    let live = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (live) {
        if (error) setNotice({ message: error.message, kind: "error" });
        setSession(data.session);
        setBooting(false);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (live) setSession(s);
    });
    return () => {
      live = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (demo) {
      refresh(null, true);
      return;
    }
    if (!session?.user?.id) {
      setFamilyInfo(null);
      setRows(EMPTY);
      return;
    }
    let active = true;
    setLoading(true);
    refresh(session.user.id, false)
      .catch((e) => {
        if (active) alert(e.message, "error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session?.user?.id, demo, refresh]);

  // Refresh visible shared data while both members have the app open.
  // Does not rely on an always-on background server or push notification service.
  useEffect(() => {
    if (demo || !configured || !session?.user?.id || !familyInfo?.household?.id)
      return;
    let running = false;
    const poll = async () => {
      if (running || document.visibilityState === "hidden") return;
      running = true;
      try {
        setRows(await loadRemote(familyInfo.household.id));
      } catch (e) {
        console.warn("Sync retry pending:", e.message);
      } finally {
        running = false;
      }
    };
    const handleFocus = () => {
      if (document.visibilityState === "visible") poll();
    };
    const timer = window.setInterval(poll, 20000);
    document.addEventListener("visibilitychange", handleFocus);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [demo, session?.user?.id, familyInfo?.household?.id]);

  async function mutate(fn) {
    setLoading(true);
    try {
      await fn();
      if (!demo) await refresh(user.id, false);
      alert("Saved successfully");
    } catch (e) {
      alert(e.message || "Something went wrong", "error");
      throw e;
    } finally {
      setLoading(false);
    }
  }
  async function saveItem(table, item, editingId) {
    const payload = { ...item };
    if (table === "tasks") {
      payload.assigned_to = payload.assigned_to || null;
    }
    if (table === "bills") payload.amount = Number(payload.amount) || 0;
    if (!editingId) {
      payload.household_id = home.id;
      if (table === "tasks" || table === "bills" || table === "events")
        payload.owner_id = user.id;
      if (table === "groceries") payload.added_by = user.id;
    }
    await mutate(async () => {
      if (demo) {
        const next = {
          ...rows,
          [table]: editingId
            ? rows[table].map((x) =>
                x.id === editingId ? { ...x, ...payload } : x,
              )
            : [{ ...payload, id: uid() }, ...rows[table]],
        };
        setRows(next);
        saveDemo(next);
      } else await upsertRemote(table, payload, editingId);
    });
    setModal(null);
  }
  async function deleteItem(table, id) {
    if (
      !window.confirm(`Delete this ${LABELS[table]?.toLowerCase() || "item"}?`)
    )
      return;
    await mutate(async () => {
      if (demo) {
        const next = {
          ...rows,
          [table]: rows[table].filter((r) => r.id !== id),
        };
        setRows(next);
        saveDemo(next);
      } else await deleteRemote(table, id);
    });
  }
  async function toggleCheck(table, item, checked, occurrence = null) {
    const dataTable = table === "tasks" ? "task_completions" : "bill_payments";
    const date =
      occurrence ||
      (table === "tasks" ? taskOccurrence(item) : billOccurrence(item));
    await mutate(async () => {
      if (demo) {
        const fk = table === "tasks" ? "task_id" : "bill_id";
        const list = checked
          ? [
              ...rows[dataTable],
              {
                id: uid(),
                [fk]: item.id,
                occurrence_on: date,
                completed_by: user.id,
              },
            ]
          : rows[dataTable].filter(
              (c) => !(c[fk] === item.id && c.occurrence_on === date),
            );
        const next = { ...rows, [dataTable]: list };
        setRows(next);
        saveDemo(next);
      } else
        await setRemoteCompletion(dataTable, item.id, date, checked, user.id);
    });
  }
  async function toggleGrocery(item) {
    await mutate(async () => {
      if (demo) {
        const next = {
          ...rows,
          groceries: rows.groceries.map((x) =>
            x.id === item.id ? { ...x, checked: !x.checked } : x,
          ),
        };
        setRows(next);
        saveDemo(next);
      } else
        await upsertRemote("groceries", { checked: !item.checked }, item.id);
    });
  }
  const openModal = (table, row) => setModal({ table, row: row || null });
  const navigate = (next) => {
    setSection(next);
    setSidebarOpen(false);
  };
  const dueTasks = useMemo(
    () =>
      rows.tasks
        .filter((t) => isTaskDue(t, today))
        .sort((a, b) => (a.time || "").localeCompare(b.time || "")),
    [rows.tasks],
  );
  const completedToday = dueTasks.filter((t) =>
    doneFor("tasks", t.id, taskOccurrence(t), rows.task_completions),
  ).length;
  const progress = dueTasks.length
    ? Math.round((completedToday / dueTasks.length) * 100)
    : 0;
  const upcomingBills = useMemo(
    () =>
      rows.bills
        .map((b) => ({ ...b, occurrence: billOccurrence(b) }))
        .sort((a, b) => a.occurrence.localeCompare(b.occurrence)),
    [rows.bills],
  );
  const upcomingEvents = useMemo(
    () =>
      rows.events
        .filter((e) => e.event_date >= today)
        .slice()
        .sort((a, b) => a.event_date.localeCompare(b.event_date)),
    [rows.events],
  );
  const openGroceries = rows.groceries.filter((x) => !x.checked).length;

  if (booting)
    return (
      <div className="full-center">
        <div className="loading-icon">
          <Heart fill="currentColor" />
        </div>
        <p>Bringing your home together...</p>
      </div>
    );
  if (!configured && !demo)
    return (
      <div className="welcome-shell">
        <div className="welcome-card">
          <Logo />
          <div className="auth-art">
            <House size={44} />
            <Heart size={18} fill="currentColor" />
          </div>
          <h1>
            Welcome to your
            <br />
            <em>shared happy place.</em>
          </h1>
          <p>
            ManaLife keeps your daily tasks, groceries, bills, and family
            moments together — in one private home.
          </p>
          <div className="callout">
            <LockKeyhole size={18} /> Secure household login needs Supabase
            configuration. See <code>README.md</code> in the project.
          </div>
          {import.meta.env.DEV && (
            <button className="primary-btn full" onClick={() => setDemo(true)}>
              Explore the local demo <ChevronRight size={18} />
            </button>
          )}
          <small>
            The local demo uses sample data only. Production access always
            requires authorized sign-in.
          </small>
        </div>
      </div>
    );
  if (!demo && !user) return <AuthScreen alert={alert} notice={notice} />;
  if (!demo && loading && !familyInfo)
    return (
      <div className="full-center">
        <div className="loading-icon">
          <Heart fill="currentColor" />
        </div>
        <p>Loading your private household...</p>
      </div>
    );
  if (!home)
    return (
      <Onboarding
        user={user}
        onComplete={() => refresh(user.id, false)}
        notify={alert}
        notice={notice}
      />
    );

  const titleMap = Object.fromEntries(SECTIONS.map((s) => [s.key, s]));

  const visibleSections = SECTIONS.filter(
    (s) =>
      demo ||
      ["today", "settings", "periods", "medicines"].includes(s.key) ||
      (home.enabled_modules || []).includes(s.key),
  );

  const overviewCardData = {
    tasks: {
      title: "Tasks for Today",
      value: dueTasks.length,
      unit: "tasks",
      subtitle: `${completedToday} completed`,
      icon: ListTodo,
      color: "mint",
    },
    groceries: {
      title: "Shopping List",
      value: openGroceries,
      unit: "items",
      subtitle: "Waiting to buy",
      icon: ShoppingBasket,
      color: "peach",
    },
    bills: {
      title: "Upcoming Bills",
      value: upcomingBills.length,
      unit: "bills",
      subtitle: "Stay ahead together",
      icon: WalletCards,
      color: "lavender",
    },
    expenses: {
      title: "Daily Expenses",
      value: "View",
      unit: "expenses",
      subtitle: "Track room spending",
      icon: BarChart3,
      color: "mint",
    },
    calendar: {
      title: "Future Events",
      value: upcomingEvents.length,
      unit: "plans",
      subtitle: "Moments ahead",
      icon: CalendarDays,
      color: "yellow",
    },
    habits: {
      title: "Habit Tracker",
      value: "Open",
      unit: "",
      subtitle: "Track daily habits",
      icon: Repeat2,
      color: "mint",
    },
    meals: {
      title: "Meal Planner",
      value: "Open",
      unit: "",
      subtitle: "Plan meals together",
      icon: Coffee,
      color: "peach",
    },
    reminders: {
      title: "Reminders",
      value: "Soon",
      unit: "",
      subtitle: "Scheduling coming soon",
      icon: Bell,
      color: "yellow",
    },
    documents: {
      title: "Family Documents",
      value: "Soon",
      unit: "",
      subtitle: "Document vault coming soon",
      icon: LockKeyhole,
      color: "lavender",
    },
  };

  const overviewSelection = demo
    ? ["tasks", "groceries", "bills", "calendar", "expenses"]
    : Array.isArray(home.overview_modules)
      ? home.overview_modules
      : [];

  const enabledForRoom = demo
    ? Object.keys(overviewCardData)
    : Array.isArray(home.enabled_modules)
      ? home.enabled_modules
      : [];

  const overviewCards = overviewSelection
    .filter((key) => enabledForRoom.includes(key) && overviewCardData[key])
    .map((key) => ({
      key,
      ...overviewCardData[key],
    }));

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="side-inner">
          <div className="side-brand">
            <Logo />
            <IconButton
              icon={X}
              title="Close navigation"
              className="close-sidebar"
              onClick={() => setSidebarOpen(false)}
            />
          </div>
          <div className="side-caption">WORKSPACE</div>

          <RoomSelector
            rooms={rooms}
            home={home}
            demo={demo}
            onSelect={(roomId) => {
              setSection("today");
              setSidebarOpen(false);
              setRows(EMPTY);
              setActiveRoomId(roomId);
            }}
            onCreated={(roomId) => {
              setSection("today");
              setSidebarOpen(false);
              setRows(EMPTY);
              setActiveRoomId(roomId);
            }}
          />

          <div className="side-caption">MENU</div>
          <nav className="side-nav" aria-label="Main navigation">
            {visibleSections.map(({ key, title, icon: Icon }) => (
              <button
                key={key}
                onClick={() => navigate(key)}
                className={`nav-link ${section === key ? "active" : ""}`}
              >
                <Icon size={19} />
                <span>{title}</span>
                {key === "groceries" && openGroceries > 0 && (
                  <b className="nav-count">{openGroceries}</b>
                )}
              </button>
            ))}
          </nav>
          <div className="side-bottom">
            <div className="privacy-tile">
              <ShieldCheck size={18} />
              <div>
                <b>Just your family</b>
                <small>Private, secure & shared</small>
              </div>
            </div>
            <button
              className="profile-line"
              onClick={() => navigate("settings")}
            >
              <span className="avatar small">{initials(userName)}</span>
              <span className="profile-names">
                <strong>{userName}</strong>
                <small>
                  {isOwner ? "Household owner" : "Household member"}
                </small>
              </span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </aside>
      {sidebarOpen && (
        <button
          className="scrim"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <IconButton
              icon={Menu}
              title="Open menu"
              className="hamburger"
              onClick={() => setSidebarOpen(true)}
            />
            <span className="breadcrumb">Your space</span>
            <ChevronRight size={15} />
            <strong>{titleMap[section]?.title}</strong>
          </div>
          <div className="topbar-right">
            <span className="secure-note">
              <ShieldCheck size={14} /> Household only
            </span>
            <IconButton
              icon={Bell}
              title="Reminder notifications are coming in a future version"
              onClick={() =>
                alert(
                  "Push reminders are planned for V2. They are not enabled yet.",
                  "info",
                )
              }
            />
            <button
              className="avatar top-avatar"
              onClick={() => navigate("settings")}
              title="Your profile"
            >
              {initials(userName)}
            </button>
          </div>
        </header>
        <main className="main-content">
          {section === "today" && (
            <>
              <div className="greeting">
                <div>
                  <p className="eyebrow">
                    {dateLabel(today, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <h1>
                    {greet()}, {shortName(userName)}{" "}
                    <span className="sun-emoji">✳</span>
                  </h1>
                  <p>Small steps make a beautiful life together.</p>
                </div>
                <button
                  className="primary-btn"
                  onClick={() => openModal("tasks")}
                >
                  <Plus size={18} /> New task
                </button>
              </div>
              <div className="hero-card">
                <div className="hero-copy">
                  <div className="hero-kicker">
                    <Sparkles size={15} /> YOUR DAILY RHYTHM
                  </div>
                  <h2>
                    Make today a little
                    <br />
                    <i>more wonderful.</i>
                  </h2>
                  <p>
                    One shared space for the things you need to do and the
                    moments you don't want to miss.
                  </p>
                  <div className="hero-members">
                    {people.slice(0, 4).map((p, i) => (
                      <span
                        key={p.id}
                        className={`person-bubble person-${i % 2}`}
                      >
                        {initials(p.display_name)}
                      </span>
                    ))}
                    <span>
                      {people.length} household{" "}
                      {people.length === 1 ? "member" : "members"}
                    </span>
                  </div>
                </div>
                <div className="hero-art">
                  <div className="art-orbit orbit-one" />
                  <div className="art-orbit orbit-two" />
                  <div className="art-center">
                    <Heart fill="currentColor" size={64} />
                  </div>
                  <div className="art-star star-a">✦</div>
                  <div className="art-star star-b">✳</div>
                  <div className="art-star star-c">✦</div>
                </div>
              </div>

              <div className="metrics-grid">
                {overviewCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <div
                      key={card.key}
                      className="metric"
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(card.key)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(card.key);
                        }
                      }}
                    >
                      <div className={`metric-icon ${card.color}`}>
                        <Icon size={21} />
                      </div>

                      <p>{card.title}</p>

                      <h2>
                        {card.value}
                        {card.unit && <small> {card.unit}</small>}
                      </h2>

                      <span>{card.subtitle}</span>
                    </div>
                  );
                })}

                {overviewCards.length === 0 && (
                  <div className="panel">
                    <p>No Overview cards selected for this room.</p>
                  </div>
                )}
              </div>
              <div className="content-grid">
                <div className="content-main">
                  <div className="panel">
                    <div className="panel-heading">
                      <div>
                        <h3>Today's to-dos</h3>
                        <p>Keep the momentum going</p>
                      </div>
                      <button
                        className="text-link"
                        onClick={() => navigate("tasks")}
                      >
                        View all <ArrowUpRight size={15} />
                      </button>
                    </div>
                    <div className="progress-row">
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <b>{progress}% done</b>
                    </div>
                    {dueTasks.length ? (
                      dueTasks
                        .slice(0, 6)
                        .map((t) => (
                          <TaskRow
                            key={t.id}
                            task={t}
                            people={people}
                            checked={doneFor(
                              "tasks",
                              t.id,
                              taskOccurrence(t),
                              rows.task_completions,
                            )}
                            onToggle={() =>
                              toggleCheck(
                                "tasks",
                                t,
                                !doneFor(
                                  "tasks",
                                  t.id,
                                  taskOccurrence(t),
                                  rows.task_completions,
                                ),
                              )
                            }
                            compact
                          />
                        ))
                    ) : (
                      <EmptyState
                        icon={CircleCheck}
                        heading="You're all caught up!"
                        body="Add a task to start your shared routine."
                        action={
                          <button
                            className="outline-btn"
                            onClick={() => openModal("tasks")}
                          >
                            <Plus size={16} /> Add your first task
                          </button>
                        }
                      />
                    )}
                    <button
                      className="add-inline"
                      onClick={() => openModal("tasks")}
                    >
                      <Plus size={16} /> Add a task
                    </button>
                  </div>
                </div>
                <div className="content-side">
                  <div className="panel">
                    <div className="panel-heading">
                      <div>
                        <h3>Coming up</h3>
                        <p>Don't miss what matters</p>
                      </div>
                      <CalendarDays size={18} className="muted-icon" />
                    </div>
                    {upcomingEvents.length ? (
                      upcomingEvents.slice(0, 3).map((e) => (
                        <div className="upcoming-item" key={e.id}>
                          <span className="date-chip">
                            <strong>
                              {dateLabel(e.event_date, { day: "numeric" })}
                            </strong>
                            <small>
                              {dateLabel(e.event_date, { month: "short" })}
                            </small>
                          </span>
                          <div>
                            <b>{e.title}</b>
                            <small>
                              {e.time || "All day"} · {e.category}
                            </small>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="muted-text">No upcoming plans yet.</p>
                    )}
                    <button
                      className="text-link bottom-link"
                      onClick={() => navigate("calendar")}
                    >
                      Open calendar <ArrowUpRight size={15} />
                    </button>
                  </div>
                  <div className="gentle-card">
                    <div className="gentle-icon">
                      <Coffee size={23} />
                    </div>
                    <h3>More time for what matters.</h3>
                    <p>
                      Less remembering. More living, laughing, and doing things
                      together.
                    </p>
                    <span>♥ Made for your home</span>
                  </div>
                </div>
              </div>
            </>
          )}
          {section === "tasks" && (
            <>
              <SectionHeader
                eyebrow="YOUR ROUTINE"
                title="Tasks & habits"
                description="Keep every little promise to yourself and your family."
                right={
                  <button
                    className="primary-btn"
                    onClick={() => openModal("tasks")}
                  >
                    <Plus size={17} /> Add task
                  </button>
                }
              />
              <div className="tabs">
                {[
                  ["today", "Today"],
                  ["all", "All tasks"],
                  ["mine", "Assigned to me"],
                ].map(([v, t]) => (
                  <button
                    key={v}
                    className={filter === v ? "selected" : ""}
                    onClick={() => setFilter(v)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="panel list-panel">
                {(() => {
                  const list = rows.tasks
                    .filter((t) =>
                      filter === "today"
                        ? isTaskDue(t)
                        : filter === "mine"
                          ? t.assigned_to === user.id
                          : true,
                    )
                    .sort((a, b) =>
                      (a.due_on || "").localeCompare(b.due_on || ""),
                    );
                  return list.length ? (
                    list.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        people={people}
                        checked={doneFor(
                          "tasks",
                          t.id,
                          taskOccurrence(t),
                          rows.task_completions,
                        )}
                        onToggle={() =>
                          toggleCheck(
                            "tasks",
                            t,
                            !doneFor(
                              "tasks",
                              t.id,
                              taskOccurrence(t),
                              rows.task_completions,
                            ),
                          )
                        }
                        onEdit={() => openModal("tasks", t)}
                        onDelete={() => deleteItem("tasks", t.id)}
                      />
                    ))
                  ) : (
                    <EmptyState
                      heading="Nothing here yet"
                      body="Start with a morning routine, a chore or a personal goal."
                      action={
                        <button
                          className="primary-btn"
                          onClick={() => openModal("tasks")}
                        >
                          <Plus size={16} /> Add a task
                        </button>
                      }
                    />
                  );
                })()}
              </div>
              <p className="footnote">
                <Repeat2 size={14} /> Daily, weekly and monthly tasks
                automatically appear on their scheduled days. Checkmarks reset
                for the next occurrence.
              </p>
            </>
          )}
          {section === "groceries" && (
            <>
              <SectionHeader
                eyebrow="SHOPPING TOGETHER"
                title="Grocery list"
                description="Add it once. Everyone in your household can tick it off."
                right={
                  <button
                    className="primary-btn"
                    onClick={() => openModal("groceries")}
                  >
                    <Plus size={17} /> Add item
                  </button>
                }
              />
              <div className="stats-banner">
                <ShoppingBasket size={22} />
                <div>
                  <b>{openGroceries} things to pick up</b>
                  <span>
                    {rows.groceries.filter((g) => g.checked).length} items
                    checked off
                  </span>
                </div>
              </div>
              <div className="panel list-panel grocery-list">
                {rows.groceries.length ? (
                  rows.groceries
                    .slice()
                    .sort((a, b) => Number(a.checked) - Number(b.checked))
                    .map((g) => (
                      <div
                        className={`grocery-row ${g.checked ? "is-done" : ""}`}
                        key={g.id}
                      >
                        <button
                          className={`round-check ${g.checked ? "checked" : ""}`}
                          onClick={() => toggleGrocery(g)}
                          aria-label={`Toggle ${g.name}`}
                        >
                          {g.checked && <Check size={15} />}
                        </button>
                        <div className="grocery-text">
                          <b>{g.name}</b>
                          <small>{g.quantity || "1 item"}</small>
                        </div>
                        <div className="item-actions">
                          <IconButton
                            icon={Pencil}
                            title="Edit grocery"
                            onClick={() => openModal("groceries", g)}
                          />
                          <IconButton
                            icon={Trash2}
                            title="Delete grocery"
                            onClick={() => deleteItem("groceries", g.id)}
                          />
                        </div>
                      </div>
                    ))
                ) : (
                  <EmptyState
                    icon={ShoppingBasket}
                    heading="Your basket is empty"
                    body="Add groceries you need to buy."
                  />
                )}
                <button
                  className="add-inline"
                  onClick={() => openModal("groceries")}
                >
                  <Plus size={16} /> Add to shopping list
                </button>
              </div>
            </>
          )}
          {section === "bills" && (
            <>
              <SectionHeader
                eyebrow="A LITTLE PEACE OF MIND"
                title="Bills & payments"
                description="Track due dates without last-minute surprises."
                right={
                  <button
                    className="primary-btn"
                    onClick={() => openModal("bills")}
                  >
                    <Plus size={17} /> Add bill
                  </button>
                }
              />
              <div className="stats-banner bills-banner">
                <WalletCards size={22} />
                <div>
                  <b>
                    {money(
                      upcomingBills.reduce(
                        (n, b) => n + Number(b.amount || 0),
                        0,
                      ),
                    )}{" "}
                    in tracked bills
                  </b>
                  <span>
                    Recurring bills show their next due date · Not a bank
                    connection
                  </span>
                </div>
              </div>
              <div className="cards-grid">
                {upcomingBills.length ? (
                  upcomingBills.map((b) => {
                    const paid = doneFor(
                      "bills",
                      b.id,
                      b.occurrence,
                      rows.bill_payments,
                    );
                    return (
                      <div className="bill-card" key={b.id}>
                        <div className="bill-header">
                          <div className="bill-icon">
                            <WalletCards size={21} />
                          </div>
                          <StatusPill variant={paid ? "success" : "neutral"}>
                            {paid ? "Paid" : "Upcoming"}
                          </StatusPill>
                        </div>
                        <h3>{b.title}</h3>
                        <p className="bill-money">{money(b.amount)}</p>
                        <div className="bill-details">
                          <span>
                            <CalendarDays size={14} /> {dateLabel(b.occurrence)}
                          </span>
                          <span>
                            <Repeat2 size={14} /> {b.repeat}
                          </span>
                          <ProtectedLabel />
                        </div>
                        <div className="bill-actions">
                          <button
                            className={paid ? "outline-btn" : "primary-btn"}
                            onClick={() =>
                              toggleCheck("bills", b, !paid, b.occurrence)
                            }
                          >
                            {paid ? (
                              <>
                                <Check size={15} /> Paid — Undo
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={15} /> Mark paid
                              </>
                            )}
                          </button>
                          <IconButton
                            icon={Pencil}
                            title="Edit bill"
                            onClick={() => openModal("bills", b)}
                          />
                          <IconButton
                            icon={Trash2}
                            title="Delete bill"
                            onClick={() => deleteItem("bills", b.id)}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="panel">
                    <EmptyState
                      icon={WalletCards}
                      heading="No bills yet"
                      body="Add monthly bills and track their due dates."
                      action={
                        <button
                          className="primary-btn"
                          onClick={() => openModal("bills")}
                        >
                          Add a bill
                        </button>
                      }
                    />
                  </div>
                )}
              </div>
            </>
          )}
          {section === "calendar" && (
            <>
              <SectionHeader
                eyebrow="OUR PLANS"
                title="Family calendar"
                description="Celebrate the little and big moments together."
                right={
                  <button
                    className="primary-btn"
                    onClick={() => openModal("events")}
                  >
                    <Plus size={17} /> New event
                  </button>
                }
              />
              <div className="content-grid calendar-layout">
                <div className="panel calendar-panel">
                  <div className="calendar-top">
                    <h3>
                      {calMonth.toLocaleDateString("en-IN", {
                        month: "long",
                        year: "numeric",
                      })}
                    </h3>
                    <div>
                      <IconButton
                        icon={ChevronLeft}
                        title="Previous month"
                        onClick={() =>
                          setCalMonth(
                            new Date(
                              calMonth.getFullYear(),
                              calMonth.getMonth() - 1,
                              1,
                            ),
                          )
                        }
                      />
                      <IconButton
                        icon={ChevronRight}
                        title="Next month"
                        onClick={() =>
                          setCalMonth(
                            new Date(
                              calMonth.getFullYear(),
                              calMonth.getMonth() + 1,
                              1,
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                  <CalendarGrid month={calMonth} events={rows.events} />
                </div>
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Upcoming events</h3>
                      <p>Make room for memories</p>
                    </div>
                  </div>
                  {upcomingEvents.length ? (
                    upcomingEvents.map((e) => (
                      <div className="event-row" key={e.id}>
                        <div className="date-chip">
                          <strong>
                            {dateLabel(e.event_date, { day: "numeric" })}
                          </strong>
                          <small>
                            {dateLabel(e.event_date, { month: "short" })}
                          </small>
                        </div>
                        <div>
                          <b>{e.title}</b>
                          <small>
                            {e.time || "All day"} · {e.category}
                          </small>
                          <ProtectedLabel />
                        </div>
                        <div className="item-actions">
                          <IconButton
                            icon={Pencil}
                            title="Edit event"
                            onClick={() => openModal("events", e)}
                          />
                          <IconButton
                            icon={Trash2}
                            title="Delete event"
                            onClick={() => deleteItem("events", e.id)}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      icon={CalendarDays}
                      heading="No upcoming events"
                      body="Add an anniversary, appointment or family plan."
                    />
                  )}
                </div>
              </div>
            </>
          )}

          {section === "expenses" && <ExpensesPage home={home} user={user} />}

          {section === "reminders" && (
            <>
              <SectionHeader
                eyebrow="STAY ON TRACK"
                title="Smart Reminders"
                description="Never miss important family tasks."
              />
              <div className="panel">
                <h3>Family Reminders</h3>
                <p>Scheduled reminders will appear here.</p>
              </div>
            </>
          )}

          {section === "habits" && (
            <HabitTracker home={home} user={user} people={people} demo={demo} />
          )}

          {section === "meals" && (
            <MealPlanner home={home} user={user} demo={demo} />
          )}

          {section === "documents" && (
            <>
              <SectionHeader
                eyebrow="FAMILY VAULT"
                title="Family Documents"
                description="Manage important household documents."
              />
              <div className="panel">
                <h3>Documents</h3>
                <p>Your family documents will appear here.</p>
              </div>
            </>
          )}

          {section === "periods" && ownPeriodAccess && (
            <>
              <PeriodTracker key={user.id} user={user} demo={demo} />

              <PeriodShareSettings home={home} user={user} people={people} />
            </>
          )}

          {section === "periods" && partnerCanViewPeriods && (
            <PartnerPeriodViewer
              home={home}
              user={user}
              ownerIds={periodAccess.owners}
              people={people}
            />
          )}

          {section === "medicines" && (
            <MedicineTracker user={user} demo={demo} />
          )}

          {section === "settings" && (
            <>
              <SectionHeader
                eyebrow="YOUR SPACE"
                title="Household settings"
                description="Every item is shared with household members only."
              />

              <RoomSettingsPanel
                home={home}
                isOwner={isOwner}
                demo={demo}
                onSaved={() => refresh(user.id, false)}
              />
              <LeaveRoomPanel
                home={home}
                isOwner={isOwner}
                demo={demo}
                user={user}
              />

              <RoomOwnershipPanel
                home={home}
                user={user}
                people={people}
                isOwner={isOwner}
                demo={demo}
                onChanged={async () => {
                  await refresh(user.id, false);
                  setSection("today");
                }}
              />

              <PersonalGenderSettings user={user} demo={demo} />
              <div className="settings-grid">
                <div className="panel settings-panel">
                  <h3>
                    <House size={19} /> Our household
                  </h3>
                  <div className="setting-detail">
                    <small>Household name</small>
                    <strong>{home.name}</strong>
                  </div>
                  <div className="setting-detail">
                    <small>Privacy</small>
                    <strong>
                      <ShieldCheck size={16} color="#557a67" /> Members only
                    </strong>
                  </div>
                  <div className="setting-detail">
                    <small>Family members ({people.length})</small>
                    <div className="member-list">
                      {people.map((p) => (
                        <div className="member-item" key={p.id}>
                          <span className="avatar">
                            {initials(p.display_name)}
                          </span>
                          <div>
                            <b>{p.display_name}</b>
                            <small>
                              {p.id === user.id
                                ? "You"
                                : p.id === home.created_by
                                  ? "Owner"
                                  : "Member"}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="panel settings-panel">
                  <h3>
                    <LockKeyhole size={19} /> Secure access
                  </h3>
                  <p className="settings-description">
                    Every task, grocery item, bill, and event is visible to
                    everyone in this household. Members outside this household
                    cannot access them.
                  </p>
                  {isOwner ? (
                    <InvitePanel demo={demo} notify={alert} />
                  ) : (
                    <div className="callout">
                      <CheckCircle2 size={18} /> Only your household owner can
                      invite new family members.
                    </div>
                  )}
                  <div className="settings-description small-print">
                    Invites expire in 48 hours, work once, and are tied to the
                    invited email. Login is required.
                  </div>
                </div>
                <div className="panel settings-panel">
                  <h3>
                    <Bell size={19} /> Notifications
                  </h3>
                  <p className="settings-description">
                    Recurring tasks appear when they are due. Background push
                    notifications and automated reminder emails are planned for
                    a later release and are <strong>not enabled in V1.</strong>
                  </p>
                  <div className="callout muted">
                    <AlertCircle size={17} /> Manual tracking is active;
                    automated push delivery is not.
                  </div>
                </div>
                <div className="panel settings-panel">
                  <h3>
                    <UsersRound size={19} /> Your account
                  </h3>
                  <div className="setting-detail">
                    <small>Signed in as</small>
                    <strong>{user.email}</strong>
                  </div>
                  {demo ? (
                    <button
                      className="outline-btn"
                      onClick={() => {
                        setRows(resetDemo());
                        alert("Sample data restored");
                      }}
                    >
                      Reset demo data
                    </button>
                  ) : (
                    <button
                      className="outline-btn"
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setFamilyInfo(null);
                        setRows(EMPTY);
                        navigate("today");
                      }}
                    >
                      <LogOut size={16} /> Sign out
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
        <div className="footer-line">
          Made with <Heart size={12} fill="currentColor" /> for the everyday
          moments
        </div>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {visibleSections
          .filter((s) =>
            ["today", "tasks", "groceries", "bills", "calendar"].includes(
              s.key,
            ),
          )
          .map(({ key, title, icon: Icon }) => (
            <button
              key={key}
              className={section === key ? "active" : ""}
              onClick={() => navigate(key)}
            >
              <Icon size={21} />
              <span>
                {key === "today"
                  ? "Home"
                  : key === "groceries"
                    ? "Shop"
                    : key === "bills"
                      ? "Bills"
                      : title}
              </span>
            </button>
          ))}
      </nav>
      {modal && (
        <EditModal
          key={`${modal.table}-${modal.row?.id || "new"}`}
          modal={modal}
          people={people}
          user={user}
          close={() => setModal(null)}
          save={saveItem}
          disabled={loading}
        />
      )}
      {notice && (
        <div className={`toast ${notice.kind}`} role="status">
          {notice.kind === "error" ? (
            <AlertCircle size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span>{notice.message}</span>
          <IconButton
            icon={X}
            title="Dismiss"
            onClick={() => setNotice(null)}
          />
        </div>
      )}
      {loading && <div className="saving-indicator">Saving…</div>}
    </div>
  );
}

function CalendarGrid({ month, events }) {
  const year = month.getFullYear(),
    m = month.getMonth(),
    days = new Date(year, m + 1, 0).getDate(),
    shift = (new Date(year, m, 1).getDay() + 6) % 7;
  const cells = Array.from(
    { length: Math.ceil((days + shift) / 7) * 7 },
    (_, i) => {
      const day = i - shift + 1;
      return day >= 1 && day <= days ? day : null;
    },
  );
  return (
    <div className="cal-grid">
      {["M", "T", "W", "T", "F", "S", "S"].map((x, i) => (
        <div key={i} className="cal-weekday">
          {x}
        </div>
      ))}
      {cells.map((day, i) => {
        const date = day ? isoDate(new Date(year, m, day, 12)) : "";
        const marked = events.filter((e) => e.event_date === date);
        return (
          <div
            key={i}
            className={`cal-day ${!day ? "outside" : ""} ${date === today ? "today" : ""} ${marked.length ? "marked" : ""}`}
            title={marked.map((e) => e.title).join(", ")}
          >
            {day || ""}
            {marked.length > 0 && <span className="cal-dot" />}
          </div>
        );
      })}
    </div>
  );
}

function EditModal({ modal, people, user, close, save, disabled }) {
  const { table, row } = modal;
  const [form, setForm] = useState(() => ({
    ...FORM_DEFAULT[table],
    ...(row || {}),
  }));
  const update = (key, value) => setForm((p) => ({ ...p, [key]: value }));
  const submit = (e) => {
    e.preventDefault();
    const fields = Object.keys(FORM_DEFAULT[table]);
    const clean = Object.fromEntries(fields.map((k) => [k, form[k]]));
    save(table, clean, row?.id).catch(() => {});
  };
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={`${row ? "Edit" : "New"} ${LABELS[table]}`}
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">
              {row ? "MAKE A CHANGE" : "CREATE SOMETHING NEW"}
            </p>
            <h2>
              {row ? "Edit" : "Add"} {LABELS[table]?.toLowerCase()}
            </h2>
          </div>
          <IconButton icon={X} title="Close" onClick={close} />
        </div>
        <form onSubmit={submit} className="edit-form">
          {table === "groceries" ? (
            <>
              <Field label="Item name">
                <input
                  required
                  maxLength={150}
                  autoFocus
                  placeholder="e.g. Milk, rice, tomatoes"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                />
              </Field>
              <Field label="Quantity">
                <input
                  maxLength={60}
                  placeholder="e.g. 2 litres"
                  value={form.quantity}
                  onChange={(e) => update("quantity", e.target.value)}
                />
              </Field>
            </>
          ) : (
            <>
              <Field
                label={
                  table === "tasks"
                    ? "Task name"
                    : table === "bills"
                      ? "Bill name"
                      : "Event name"
                }
              >
                <input
                  required
                  maxLength={180}
                  autoFocus
                  placeholder={
                    table === "tasks"
                      ? "e.g. Water the plants"
                      : table === "bills"
                        ? "e.g. Electricity bill"
                        : "e.g. Family dinner"
                  }
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                />
              </Field>
              {table === "tasks" && (
                <Field label="Notes (optional)">
                  <textarea
                    rows={2}
                    maxLength={1000}
                    placeholder="Add a few details..."
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                  />
                </Field>
              )}
              {table === "bills" && (
                <Field label="Amount (₹)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(e) => update("amount", e.target.value)}
                  />
                </Field>
              )}
              <div className="form-pair">
                <Field
                  label={table === "events" ? "Event date" : "Start / due date"}
                >
                  <input
                    type="date"
                    required
                    value={table === "events" ? form.event_date : form.due_on}
                    onChange={(e) =>
                      update(
                        table === "events" ? "event_date" : "due_on",
                        e.target.value,
                      )
                    }
                  />
                </Field>
                {table === "bills" ? (
                  <Field label="Repeat">
                    <select
                      value={form.repeat}
                      onChange={(e) => update("repeat", e.target.value)}
                    >
                      <option value="none">One time</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </Field>
                ) : (
                  <Field
                    label={
                      table === "events" ? "Time (optional)" : "Time (optional)"
                    }
                  >
                    <input
                      type="time"
                      value={form.time || ""}
                      onChange={(e) => update("time", e.target.value)}
                    />
                  </Field>
                )}
              </div>
              <div className="form-pair">
                <Field label="Category">
                  <select
                    value={form.category}
                    onChange={(e) => update("category", e.target.value)}
                  >
                    {(table === "tasks"
                      ? [
                          "Home",
                          "Personal",
                          "Work",
                          "Health",
                          "Wellness",
                          "Family",
                          "Other",
                        ]
                      : table === "bills"
                        ? [
                            "Utilities",
                            "Rent",
                            "Internet",
                            "Subscription",
                            "Loan",
                            "Other",
                          ]
                        : [
                            "Family",
                            "Birthday",
                            "Anniversary",
                            "Appointment",
                            "Planning",
                            "Other",
                          ]
                    ).map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Field>
                {table === "tasks" ? (
                  <Field label="Repeat">
                    <select
                      value={form.repeat}
                      onChange={(e) => update("repeat", e.target.value)}
                    >
                      <option value="none">One time</option>
                      <option value="daily">Every day</option>
                      <option value="weekly">Every week</option>
                      <option value="monthly">Every month</option>
                    </select>
                  </Field>
                ) : null}
              </div>
              {table === "tasks" && (
                <>
                  <div className="form-pair">
                    <Field label="Assign to">
                      <select
                        value={form.assigned_to || ""}
                        onChange={(e) => update("assigned_to", e.target.value)}
                      >
                        <option value="">Anyone</option>
                        {people.map((p) => (
                          <option value={p.id} key={p.id}>
                            {p.display_name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Priority">
                      <select
                        value={form.priority}
                        onChange={(e) => update("priority", e.target.value)}
                      >
                        {Object.entries(priorityLabel).map(([k, v]) => (
                          <option value={k} key={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <p className="fineprint">
                    <UsersRound size={14} /> All tasks are visible to your
                    household, no matter who is assigned.
                  </p>
                </>
              )}
            </>
          )}
          <div className="modal-actions">
            <button type="button" className="outline-btn" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="primary-btn" disabled={disabled}>
              {row ? "Save changes" : "Add " + LABELS[table]?.toLowerCase()}{" "}
              <Check size={17} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AuthScreen({ alert, notice }) {
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name.trim() } },
        });
        if (error) throw error;
        alert(
          data.session
            ? "Account created. Welcome!"
            : "Check your email to verify your new account.",
          "info",
        );
      }
    } catch (e) {
      alert(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-shell">
      <div className="auth-left">
        <Logo />
        <div className="auth-illustration">
          <div className="illustration-circle">
            <House size={95} strokeWidth={1.1} />
            <Heart
              className="illustration-heart"
              size={43}
              fill="currentColor"
            />
          </div>
          <div className="floating-badge badge-one">
            <CheckCircle2 size={19} /> Tasks, sorted!
          </div>
          <div className="floating-badge badge-two">
            <ShoppingBasket size={19} /> Shared shopping
          </div>
        </div>
        <div className="auth-hero-copy">
          <h1>
            Build a beautiful
            <br />
            <i>everyday life.</i>
          </h1>
          <p>A calmer way to handle everything, together.</p>
          <div className="auth-private">
            <ShieldCheck size={18} /> Every family has its own secure space
          </div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-card">
          <div className="mobile-brand">
            <Logo />
          </div>
          <p className="eyebrow">WELCOME TO MANALIFE</p>
          <h2>{tab === "login" ? "Hello again!" : "Join your home."}</h2>
          <p className="subhead">
            {tab === "login"
              ? "Sign in to your private family space."
              : "Create an account, then start your own family or join one by invitation."}
          </p>
          <div className="auth-tabs">
            <button
              className={tab === "login" ? "active" : ""}
              onClick={() => setTab("login")}
            >
              Sign in
            </button>
            <button
              className={tab === "register" ? "active" : ""}
              onClick={() => setTab("register")}
            >
              Create account
            </button>
          </div>
          <form className="edit-form" onSubmit={submit}>
            {tab === "register" && (
              <Field label="Your name">
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your first name"
                  maxLength={70}
                />
              </Field>
            )}
            <Field label="Email address">
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                autoComplete={
                  tab === "login" ? "current-password" : "new-password"
                }
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </Field>
            <button disabled={busy} type="submit" className="primary-btn full">
              {busy
                ? "Please wait..."
                : tab === "login"
                  ? "Sign in securely"
                  : "Create account"}{" "}
              <ArrowUpRight size={17} />
            </button>
          </form>
          <div className="auth-note">
            <LockKeyhole size={17} />
            <span>
              Email verification is required. Create your own household or join
              an existing one with an email-specific invitation.
            </span>
          </div>
          {notice && (
            <p className={`inline-message ${notice.kind}`}>{notice.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Onboarding({ user, onComplete, notify, notice }) {
  const [tab, setTab] = useState("create"),
    [name, setName] = useState("Our Home"),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === "join") await joinFamily(code);
      else await createFamily(name);
      notify("Your household is ready!");
      await onComplete();
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="welcome-shell">
      <div className="welcome-card">
        <Logo />
        <div className="setup-icon">
          <House size={37} />
        </div>
        <p className="eyebrow">YOUR OWN PRIVATE FAMILY SPACE</p>
        <h1>
          Let's bring your
          <br />
          <em>people together.</em>
        </h1>
        <p>
          Welcome, {user.user_metadata?.display_name || user.email}. Confirm
          your email to create a new household instantly, or join a family's
          household using an invitation for your email.
        </p>
        <div className="auth-tabs">
          <button
            className={tab === "join" ? "active" : ""}
            onClick={() => setTab("join")}
          >
            Join family with code
          </button>
          <button
            className={tab === "create" ? "active" : ""}
            onClick={() => setTab("create")}
          >
            Start a new family
          </button>
        </div>
        <form onSubmit={submit} className="edit-form">
          {tab === "join" ? (
            <>
              <Field label="Your invitation code">
                <input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Paste your private code"
                />
              </Field>
              <p className="fineprint">
                Ask the household owner for a code generated specifically for
                your email address.
              </p>
            </>
          ) : (
            <>
              <Field label="Household name">
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </Field>
              <p className="fineprint">
                Any verified new account can create its own private household.
                You become its owner and can invite your family.
              </p>
            </>
          )}
          <button className="primary-btn full" disabled={busy}>
            {busy
              ? "Checking..."
              : tab === "join"
                ? "Join family"
                : "Create my home"}{" "}
            <ChevronRight size={16} />
          </button>
        </form>
        <button
          className="text-link signout-link"
          onClick={() => supabase.auth.signOut()}
        >
          Use a different account <LogOut size={15} />
        </button>
        {notice && (
          <p className={`inline-message ${notice.kind}`}>{notice.message}</p>
        )}
      </div>
    </div>
  );
}

function InvitePanel({ demo, notify }) {
  const [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false);
  async function create(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (demo) {
        setCode("DEMO-CODE-NOT-VALID");
        notify(
          "Preview invite only. Use configured Supabase to invite for real.",
          "info",
        );
      } else {
        const result = await inviteFamily(email);
        setCode(result);
        notify(
          "Private invitation created. Share it securely with the matching email.",
        );
      }
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="invite-form" onSubmit={create}>
      <Field label="Invite a family member by email">
        <input
          required
          type="email"
          placeholder="partner@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <button className="primary-btn" disabled={busy}>
        <Mail size={16} /> {busy ? "Creating..." : "Generate private invite"}
      </button>
      {code && (
        <div className="invite-code">
          <small>
            One-time code for this email — expires after 48 hours. Share it with
            the recipient yourself; ManaLife does not email it automatically.
          </small>
          <code>{code}</code>
          <button
            type="button"
            className="outline-btn"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                notify("Code copied!");
              } catch {
                notify("Please select and copy the code manually", "info");
              }
            }}
          >
            <Copy size={15} /> Copy code
          </button>
        </div>
      )}
    </form>
  );
}

export default App;
