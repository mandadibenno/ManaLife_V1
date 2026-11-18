import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
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

  const types = ["breakfast", "lunch", "dinner"];
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
              gridTemplateColumns: "105px repeat(3, minmax(145px, 1fr))",
              gap: 8,
              minWidth: 580,
              marginTop: 16,
            }}
          >
            <strong>Day</strong>
            {types.map((t) => (
              <strong key={t} style={{ textTransform: "capitalize" }}>
                {t}
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

      <div style={card}>
        <h3>{selectedMeal ? "Edit Meal" : "Add Meal"}</h3>
        <p style={{ color: "#718779" }}>
          {selectedDate} · {mealType}
        </p>

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

function App() {
  const [demo, setDemo] = useState(false);
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [familyInfo, setFamilyInfo] = useState(null);
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
        setFamilyInfo(null);
        setRows(EMPTY);
        return;
      }
      const family = await loadHousehold(userId);
      setFamilyInfo(family);
      if (family?.household) {
        setRows(await loadRemote(family.household.id));
      } else setRows(EMPTY);
    },
    [demo],
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
          <div className="home-card">
            <div className="home-avatar">
              <House size={19} />
            </div>
            <div>
              <strong>{home.name}</strong>
              <small>
                <span className="online-dot" /> Private household
              </small>
            </div>
            <ChevronDown size={15} />
          </div>
          <div className="side-caption">MENU</div>
          <nav className="side-nav" aria-label="Main navigation">
            {SECTIONS.map(({ key, title, icon: Icon }) => (
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
                <div
                  className="metric"
                  onClick={() => navigate("tasks")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate("tasks");
                    }
                  }}
                >
                  <div className="metric-icon mint">
                    <ListTodo size={21} />
                  </div>
                  <p>Tasks for today</p>
                  <h2>
                    {dueTasks.length}
                    <small> tasks</small>
                  </h2>
                  <span>{completedToday} completed</span>
                </div>
                <div
                  className="metric"
                  onClick={() => navigate("groceries")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate("groceries");
                    }
                  }}
                >
                  <div className="metric-icon peach">
                    <ShoppingBasket size={21} />
                  </div>
                  <p>Shopping list</p>
                  <h2>
                    {openGroceries}
                    <small> items</small>
                  </h2>
                  <span>Waiting to buy</span>
                </div>
                <div className="metric" onClick={() => navigate("bills")}>
                  <div className="metric-icon lavender">
                    <WalletCards size={21} />
                  </div>
                  <p>Upcoming bills</p>
                  <h2>
                    {upcomingBills.length}
                    <small> bills</small>
                  </h2>
                  <span>Stay ahead together</span>
                </div>
                <div className="metric" onClick={() => navigate("calendar")}>
                  <div className="metric-icon yellow">
                    <CalendarDays size={21} />
                  </div>
                  <p>Future events</p>
                  <h2>
                    {upcomingEvents.length}
                    <small> plans</small>
                  </h2>
                  <span>Moments ahead</span>
                </div>

                <div
                  className="metric"
                  onClick={() => navigate("expenses")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate("expenses");
                    }
                  }}
                >
                  <div className="metric-icon mint">
                    <BarChart3 size={21} />
                  </div>

                  <p>Daily Expenses</p>

                  <h2>
                    View <small>expenses</small>
                  </h2>

                  <span>Track your family spending</span>
                </div>
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

          {section === "settings" && (
            <>
              <SectionHeader
                eyebrow="YOUR SPACE"
                title="Household settings"
                description="Every item is shared with household members only."
              />
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
        {SECTIONS.filter((s) =>
          ["today", "tasks", "groceries", "bills", "calendar"].includes(s.key),
        ).map(({ key, title, icon: Icon }) => (
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
