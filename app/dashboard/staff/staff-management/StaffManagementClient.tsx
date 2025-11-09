"use client";

import { FormEvent, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Loader2, Plus, Trash2, PencilLine, ShieldCheck, Users, Crown } from "lucide-react";

export interface StaffMember {
  id: string;
  email: string;
  role: "super_admin" | "staff";
  createdAt: string;
}

export interface StaffManagementProps {
  currentUserId: string;
  staff: StaffMember[];
}

const cardClasses =
  "rounded-3xl border border-white/40 bg-white/80 px-6 py-5 shadow-sm transition hover:shadow-lg";

export default function StaffManagementClient({ currentUserId, staff }: StaffManagementProps) {
  const [members, setMembers] = useState<StaffMember[]>(staff);
  const [isCreating, setIsCreating] = useState(false);
  const [newStaff, setNewStaff] = useState({ email: "", password: "", role: "staff" as "staff" | "super_admin" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ email: "", password: "", role: "staff" as "staff" | "super_admin" });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const superAdminCount = useMemo(
    () => members.filter((member) => member.role === "super_admin").length,
    [members]
  );

  const resetCreateForm = () => {
    setNewStaff({ email: "", password: "", role: "staff" });
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newStaff.email.trim() || !newStaff.password.trim()) {
      toast.error("Email and password are required.");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/staff/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newStaff.email,
          password: newStaff.password,
          role: newStaff.role,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error((data as { error?: string }).error ?? "Unable to create staff member.");
        return;
      }

      const created = data.user as { id: string; email: string; role: "super_admin" | "staff"; created_at: string };
      setMembers((prev) => [{ id: created.id, email: created.email, role: created.role, createdAt: created.created_at }, ...prev]);
      toast.success("Staff member created.");
      resetCreateForm();
    } catch (error) {
      console.error("Create staff error", error);
      toast.error("Unexpected error while creating staff.");
    } finally {
      setIsCreating(false);
    }
  };

  const startEditing = (member: StaffMember) => {
    setEditingId(member.id);
    setEditForm({ email: member.email, password: "", role: member.role });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ email: "", password: "", role: "staff" });
  };

  const handleSaveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingId) {
      return;
    }

    const original = members.find((member) => member.id === editingId);
    if (!original) {
      toast.error("Staff member not found.");
      return;
    }

    const payload: Record<string, unknown> = {};
    if (editForm.email.trim() && editForm.email.trim() !== original.email) {
      payload.email = editForm.email.trim();
    }
    if (editForm.password.trim()) {
      payload.password = editForm.password.trim();
    }
    if (editForm.role !== original.role) {
      payload.role = editForm.role;
    }

    if (Object.keys(payload).length === 0) {
      toast.error("No changes to save.");
      return;
    }

    setIsSavingEdit(true);
    try {
      const response = await fetch(`/api/staff/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error((data as { error?: string }).error ?? "Unable to update staff member.");
        return;
      }

      const updated = data.user as { id: string; email: string; role: "super_admin" | "staff"; created_at: string };
      setMembers((prev) =>
        prev.map((member) =>
          member.id === updated.id
            ? { id: updated.id, email: updated.email, role: updated.role, createdAt: updated.created_at }
            : member
        )
      );
      toast.success("Staff member updated.");
      cancelEditing();
    } catch (error) {
      console.error("Update staff error", error);
      toast.error("Unexpected error while updating staff.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (member: StaffMember) => {
    if (member.id === currentUserId) {
      toast.error("You cannot delete your own account.");
      return;
    }

    if (member.role === "super_admin" && superAdminCount <= 1) {
      toast.error("At least one super admin must remain active.");
      return;
    }

    if (!window.confirm(`Delete staff account for ${member.email}? This cannot be undone.`)) {
      return;
    }

    setDeletingId(member.id);
    try {
      const response = await fetch(`/api/staff/${member.id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error((data as { error?: string }).error ?? "Unable to delete staff member.");
        return;
      }

      setMembers((prev) => prev.filter((entry) => entry.id !== member.id));
      toast.success("Staff member removed.");
    } catch (error) {
      console.error("Delete staff error", error);
      toast.error("Unexpected error while deleting staff.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-white via-white to-secondary/10 px-6 py-10 lg:px-12">
      <header className="rounded-3xl border border-white/40 bg-white/70 p-8 shadow-lg backdrop-blur">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-secondary">Super admin tools</p>
            <h1 className="mt-1 text-3xl font-semibold text-text">Staff management</h1>
            <p className="mt-2 max-w-2xl text-sm text-text/70">
              Provision new staff accounts, update access levels, and audit who can coordinate the Career City experience.
            </p>
          </div>
          <div className="rounded-2xl border border-secondary/30 bg-secondary/10 px-4 py-2 text-xs uppercase tracking-wide text-secondary">
            <ShieldCheck className="mr-2 inline h-4 w-4" />
            Super admins: {superAdminCount}
          </div>
        </div>
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form className={`${cardClasses} flex flex-col gap-5`} onSubmit={handleCreate}>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
              <Plus className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-text">Create new staff account</h2>
              <p className="text-sm text-text/60">Grant staff or super admin privileges to colleagues.</p>
            </div>
          </div>

          <label className="flex flex-col gap-2 text-sm font-medium text-text">
            Staff email
            <input
              type="email"
              required
              value={newStaff.email}
              onChange={(event) => setNewStaff((prev) => ({ ...prev, email: event.target.value }))}
              className="rounded-2xl border border-secondary/30 bg-white px-4 py-3 text-base text-text outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              placeholder="colleague@example.edu"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-text">
            Temporary password
            <input
              type="password"
              required
              value={newStaff.password}
              onChange={(event) => setNewStaff((prev) => ({ ...prev, password: event.target.value }))}
              className="rounded-2xl border border-secondary/30 bg-white px-4 py-3 text-base text-text outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
              placeholder="Set a secure password"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-text">
            Role
            <select
              value={newStaff.role}
              onChange={(event) => setNewStaff((prev) => ({ ...prev, role: event.target.value as "staff" | "super_admin" }))}
              className="rounded-2xl border border-secondary/30 bg-white px-4 py-3 text-base text-text outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
            >
              <option value="staff">Staff</option>
              <option value="super_admin">Super admin</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={isCreating}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-80"
          >
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
            {isCreating ? "Creating" : "Create account"}
          </button>
        </form>

        <div className={`${cardClasses} flex flex-col gap-5`}>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
              <Crown className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-text">Active staff</h2>
              <p className="text-sm text-text/60">Edit roles or remove access in real time.</p>
            </div>
          </div>

          <div className="space-y-4">
            {members.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-secondary/30 bg-white/60 p-6 text-center text-text/60">
                No staff accounts yet. Create the first teammate using the form on the left.
              </div>
            ) : (
              members.map((member) => {
                const isEditing = editingId === member.id;
                const isSelf = member.id === currentUserId;
                const isDeleting = deletingId === member.id;

                return (
                  <div key={member.id} className="rounded-2xl border border-white/40 bg-white/80 p-5 shadow-sm">
                    {isEditing ? (
                      <form className="flex flex-col gap-3" onSubmit={handleSaveEdit}>
                        <label className="flex flex-col gap-1 text-xs font-medium uppercase text-text/60">
                          Email
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
                            className="rounded-2xl border border-secondary/30 bg-white px-4 py-2 text-sm text-text outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                            required
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs font-medium uppercase text-text/60">
                          New password (optional)
                          <input
                            type="password"
                            value={editForm.password}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, password: event.target.value }))}
                            className="rounded-2xl border border-secondary/30 bg-white px-4 py-2 text-sm text-text outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                            placeholder="Leave blank to keep current password"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs font-medium uppercase text-text/60">
                          Role
                          <select
                            value={editForm.role}
                            onChange={(event) => setEditForm((prev) => ({ ...prev, role: event.target.value as "staff" | "super_admin" }))}
                            className="rounded-2xl border border-secondary/30 bg-white px-4 py-2 text-sm text-text outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/30"
                          >
                            <option value="staff">Staff</option>
                            <option value="super_admin">Super admin</option>
                          </select>
                        </label>

                        <div className="mt-2 flex flex-wrap gap-3">
                          <button
                            type="submit"
                            disabled={isSavingEdit}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-80"
                          >
                            {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <PencilLine className="h-4 w-4" />}
                            {isSavingEdit ? "Saving" : "Save changes"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-secondary/30 px-4 py-2 text-xs font-semibold text-secondary transition hover:border-secondary/40 hover:text-secondary/80"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold text-text">{member.email}</p>
                            <p className="text-xs uppercase tracking-wide text-text/60">
                              {member.role === "super_admin" ? "Super admin" : "Staff"} • Joined {new Date(member.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => startEditing(member)}
                              className="inline-flex items-center justify-center gap-2 rounded-full border border-secondary/30 px-3 py-1.5 text-xs font-semibold text-secondary transition hover:border-secondary/40 hover:text-secondary/80"
                            >
                              <PencilLine className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(member)}
                              disabled={isSelf || isDeleting}
                              className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              Delete
                            </button>
                          </div>
                        </div>
                        {isSelf && (
                          <p className="text-xs text-text/60">
                            You are signed in as this account. Deleting is disabled to prevent locking out the console.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}