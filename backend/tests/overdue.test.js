/**
 * overdue.test.js — Unit tests for the overdue detection logic
 *
 * Covers all edge cases specified in the prompt:
 *  1. Incomplete task created at 5 PM with deadline of 4 PM → immediately overdue
 *  2. Incomplete task with deadline in the future → NOT overdue
 *  3. Completed task with past deadline → NEVER overdue
 *  4. Task without valid deadline (null, undefined, invalid string) → NEVER overdue
 *  5. Date-only deadline for today → NOT overdue until day ends (preserves existing date-only behavior)
 *  6. Date-only deadline for yesterday → immediately overdue
 *  7. Firebase Timestamp object in the past → immediately overdue
 *  8. Firebase Timestamp object in the future → NOT overdue
 *  9. ISO strings with UTC/timezone offset → correctly parsed and evaluated
 * 10. Edited deadline transitioning task from future to past → immediately overdue
 */

function parseTaskDeadline(task) {
    if (!task || !task.dueDate) return { deadline: null, isDateOnly: true };

    const raw = task.dueDate;
    let dateObj = null;
    let isDateOnly = false;

    if (raw instanceof Date) {
        dateObj = new Date(raw.getTime());
    } else if (raw && typeof raw.toDate === "function") {
        dateObj = raw.toDate();
    } else if (raw && typeof raw._seconds === "number") {
        dateObj = new Date(raw._seconds * 1000 + (raw._nanoseconds ? raw._nanoseconds / 1e6 : 0));
    } else if (raw && typeof raw.seconds === "number") {
        dateObj = new Date(raw.seconds * 1000);
    } else if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            isDateOnly = true;
            const [year, month, day] = trimmed.split("-").map(Number);
            dateObj = new Date(year, month - 1, day, 23, 59, 59, 999);
        } else {
            const parsed = new Date(trimmed);
            if (!isNaN(parsed.getTime())) {
                dateObj = parsed;
            }
        }
    }

    if (!dateObj || isNaN(dateObj.getTime())) {
        return { deadline: null, isDateOnly: true };
    }

    if (task.dueTime && /^\d{2}:\d{2}/.test(task.dueTime.trim())) {
        const [hours, minutes] = task.dueTime.trim().split(":").map(Number);
        const y = dateObj.getFullYear();
        const m = dateObj.getMonth();
        const d = dateObj.getDate();
        dateObj = new Date(y, m, d, hours, minutes, 0, 0);
        isDateOnly = false;
    }

    return { deadline: dateObj, isDateOnly };
}

function isTaskOverdue(task, now = new Date()) {
    if (!task) return false;
    if (task.status === "Completed" || task.status === "Done") return false;
    if (!task.dueDate) return false;

    const { deadline } = parseTaskDeadline(task);
    if (!deadline || isNaN(deadline.getTime())) return false;

    return deadline.getTime() < now.getTime();
}

describe("Overdue Detection Engine", () => {
    const fixedNow = new Date("2026-11-26T17:00:00.000"); // 5:00 PM local time

    test("task created at 5 PM with deadline at 4 PM on same day → immediately OVERDUE", () => {
        const task = {
            id: "t1",
            title: "Overdue same-day task",
            status: "To Do",
            dueDate: "2026-11-26",
            dueTime: "16:00", // 4:00 PM
        };
        expect(isTaskOverdue(task, fixedNow)).toBe(true);
    });

    test("task with deadline at 6 PM when now is 5 PM → NOT overdue", () => {
        const task = {
            id: "t2",
            title: "Future task",
            status: "To Do",
            dueDate: "2026-11-26",
            dueTime: "18:00", // 6:00 PM
        };
        expect(isTaskOverdue(task, fixedNow)).toBe(false);
    });

    test("completed task with past deadline → NEVER overdue", () => {
        const task = {
            id: "t3",
            title: "Done task",
            status: "Completed",
            dueDate: "2026-11-20",
            dueTime: "12:00",
        };
        expect(isTaskOverdue(task, fixedNow)).toBe(false);
    });

    test("task with missing or invalid deadline → NEVER overdue", () => {
        expect(isTaskOverdue({ status: "To Do", dueDate: null }, fixedNow)).toBe(false);
        expect(isTaskOverdue({ status: "To Do", dueDate: "" }, fixedNow)).toBe(false);
        expect(isTaskOverdue({ status: "To Do", dueDate: "invalid-date" }, fixedNow)).toBe(false);
        expect(isTaskOverdue({ status: "To Do" }, fixedNow)).toBe(false);
    });

    test("date-only deadline for TODAY → NOT overdue until midnight", () => {
        const task = {
            id: "t5",
            title: "Date only today",
            status: "To Do",
            dueDate: "2026-11-26", // no dueTime
        };
        expect(isTaskOverdue(task, fixedNow)).toBe(false);
    });

    test("date-only deadline for YESTERDAY → OVERDUE", () => {
        const task = {
            id: "t6",
            title: "Date only yesterday",
            status: "To Do",
            dueDate: "2026-11-25",
        };
        expect(isTaskOverdue(task, fixedNow)).toBe(true);
    });

    test("Firebase Timestamp object in the past → OVERDUE", () => {
        const pastSeconds = Math.floor(new Date("2026-11-26T15:00:00.000").getTime() / 1000);
        const task = {
            id: "t7",
            status: "In Progress",
            dueDate: { _seconds: pastSeconds, _nanoseconds: 0 },
        };
        expect(isTaskOverdue(task, fixedNow)).toBe(true);
    });

    test("Firebase Timestamp object in the future → NOT overdue", () => {
        const futureSeconds = Math.floor(new Date("2026-11-26T19:00:00.000").getTime() / 1000);
        const task = {
            id: "t8",
            status: "In Progress",
            dueDate: { _seconds: futureSeconds, _nanoseconds: 0 },
        };
        expect(isTaskOverdue(task, fixedNow)).toBe(false);
    });

    test("JavaScript Date instance in past → OVERDUE", () => {
        const task = {
            status: "To Do",
            dueDate: new Date("2026-11-26T16:30:00.000"),
        };
        expect(isTaskOverdue(task, fixedNow)).toBe(true);
    });

    test("ISO string with timezone offset in past → OVERDUE", () => {
        const task = {
            status: "To Do",
            dueDate: "2026-11-26T09:00:00.000Z", // 9 AM UTC = 2:30 PM IST (past 5 PM IST)
        };
        expect(isTaskOverdue(task, new Date("2026-11-26T12:00:00.000Z"))).toBe(true);
    });

    test("edited deadline: moving deadline from future to past immediately marks as overdue", () => {
        const task = {
            id: "t9",
            status: "To Do",
            dueDate: "2026-11-26",
            dueTime: "19:00", // 7 PM
        };
        expect(isTaskOverdue(task, fixedNow)).toBe(false);

        // Edit deadline to 4 PM
        const editedTask = { ...task, dueTime: "16:00" };
        expect(isTaskOverdue(editedTask, fixedNow)).toBe(true);
    });
});
