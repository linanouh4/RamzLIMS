"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";

const roles = ["admin", "lab", "reception", "technician"];

type Branch = {
  id: number;
  name: string;
  code: string;
  city: string | null;
  is_active: boolean;
};

type User = {
  id: number;
  username: string;
  full_name: string;
  role: string;
  signature: string | null;
  branch_id: number | null;
  branch?: Branch | null;
};

export default function Employees() {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("reception");
  const [branchId, setBranchId] = useState("");
  const [signature, setSignature] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const [usersResult, branchesResult] = await Promise.all([
      supabase
        .from("users")
        .select(`
          id,
          username,
          full_name,
          role,
          signature,
          branch_id,
          branches (
            id,
            name,
            code,
            city,
            is_active
          )
        `)
        .order("id", { ascending: true }),

      supabase
        .from("branches")
        .select("id, name, code, city, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);

    if (usersResult.error) {
      alert("Users error: " + usersResult.error.message);
      setLoading(false);
      return;
    }

    if (branchesResult.error) {
      alert("Branches error: " + branchesResult.error.message);
      setLoading(false);
      return;
    }

    const formattedUsers = (usersResult.data || []).map((user: any) => ({
      ...user,
      branch: Array.isArray(user.branches)
        ? user.branches[0] || null
        : user.branches || null,
    }));

    setUsers(formattedUsers);
    setBranches(branchesResult.data || []);
    setLoading(false);
  }

  function resetForm() {
    setUsername("");
    setFullName("");
    setPassword("");
    setRole("reception");
    setBranchId("");
    setSignature("");
    setSelectedUser(null);
  }

  function openCreateModal() {
    resetForm();
    setOpenModal(true);
  }

  function openEditModal(user: User) {
    setSelectedUser(user);
    setUsername(user.username || "");
    setFullName(user.full_name || "");
    setPassword("");
    setRole(user.role || "reception");
    setBranchId(user.branch_id ? String(user.branch_id) : "");
    setSignature(user.signature || "");
    setOpenModal(true);
  }

  async function uploadSignature(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    const extension = file.name.split(".").pop();
    const fileName = `signature-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("signatures")
      .upload(fileName, file);

    if (uploadError) {
      alert(uploadError.message);
      return;
    }

    const { data } = supabase.storage
      .from("signatures")
      .getPublicUrl(fileName);

    setSignature(data.publicUrl);

    alert("Signature uploaded successfully");
  }

  async function saveUser() {
    if (!username.trim() || !fullName.trim()) {
      alert("Please enter username and full name");
      return;
    }

    if (!branchId) {
      alert("Please select a branch");
      return;
    }

    if (!selectedUser && !password.trim()) {
      alert("Please enter a password for the new user");
      return;
    }

    try {
      if (selectedUser) {
        const updateData: any = {
          username: username.trim(),
          full_name: fullName.trim(),
          role,
          branch_id: Number(branchId),
          signature: signature || null,
        };

        if (password.trim()) {
          updateData.password = password.trim();
        }

        const { data: updatedUser, error } = await supabase
          .from("users")
          .update(updateData)
          .eq("id", selectedUser.id)
          .select(
            "id, username, full_name, role, signature, branch_id"
          );

        if (error) {
          alert("SAVE ERROR: " + error.message);
          return;
        }

        if (!updatedUser || updatedUser.length === 0) {
          alert(
            "لم يتم تعديل المستخدم. تحقق من صلاحيات UPDATE في Supabase."
          );
          return;
        }

        alert("تم تعديل الموظف بنجاح");
      } else {
        const { data: newUser, error } = await supabase
          .from("users")
          .insert([
            {
              username: username.trim(),
              full_name: fullName.trim(),
              password: password.trim(),
              role,
              branch_id: Number(branchId),
              signature: signature || null,
            },
          ])
          .select(
            "id, username, full_name, role, signature, branch_id"
          );

        if (error) {
          alert("SAVE ERROR: " + error.message);
          return;
        }

        console.log("CREATED USER:", newUser);

        alert("تم إنشاء الموظف بنجاح");
      }

      setOpenModal(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error("SAVE USER ERROR:", error);
      alert("حدث خطأ أثناء حفظ الموظف");
    }
  }

  async function deleteUser(id: number) {
    const confirmed = confirm(
      "هل أنت متأكد من حذف هذا الموظف؟"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();
  }

  return (
    <ProtectedRoute adminOnly={true}>
      <main className="min-h-screen bg-gray-100 p-8">

        {/* HEADER */}
        <div className="flex flex-col gap-6 mb-8 md:flex-row md:justify-between md:items-end">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ← Back
            </button>

            <div>
              <h1 className="text-3xl font-bold">
                Employees
              </h1>

              <p className="text-gray-500 mt-2">
                Manage employees, roles, branches and signatures.
              </p>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-lg"
          >
            + Add Employee
          </button>
        </div>

        {/* USERS TABLE */}
        <div className="bg-white rounded-xl shadow overflow-hidden">

          {loading ? (
            <div className="p-6 text-center">
              Loading employees...
            </div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center">
              No employees found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">

                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-4 text-left">ID</th>
                    <th className="p-4 text-left">Username</th>
                    <th className="p-4 text-left">Full Name</th>
                    <th className="p-4 text-left">Role</th>
                    <th className="p-4 text-left">Branch</th>
                    <th className="p-4 text-left">Signature</th>
                    <th className="p-4 text-left">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-t hover:bg-gray-50"
                    >
                      <td className="p-4">
                        {user.id}
                      </td>

                      <td className="p-4">
                        {user.username}
                      </td>

                      <td className="p-4 font-medium">
                        {user.full_name}
                      </td>

                      <td className="p-4 capitalize">
                        {user.role}
                      </td>

                      <td className="p-4">
                        {user.branch ? (
                          <div>
                            <div className="font-medium">
                              {user.branch.name}
                            </div>

                            <div className="text-xs text-gray-500">
                              {user.branch.code}
                              {user.branch.city
                                ? ` • ${user.branch.city}`
                                : ""}
                            </div>
                          </div>
                        ) : (
                          <span className="text-red-500">
                            No branch
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        {user.signature ? (
                          <img
                            src={user.signature}
                            alt="Signature"
                            className="h-12 w-24 object-contain border rounded"
                          />
                        ) : (
                          <span className="text-gray-400">
                            No signature
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">

                          <button
                            onClick={() =>
                              openEditModal(user)
                            }
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              deleteUser(user.id)
                            }
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg"
                          >
                            Delete
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>
          )}
        </div>

        {/* MODAL */}
        {openModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">

            <div className="w-full max-w-xl bg-white rounded-2xl p-6 shadow-xl">

              <div className="flex items-center justify-between mb-6">

                <h2 className="text-2xl font-bold">
                  {selectedUser
                    ? "Edit Employee"
                    : "Add Employee"}
                </h2>

                <button
                  onClick={() => setOpenModal(false)}
                  className="text-gray-500 hover:text-gray-800"
                >
                  ✕
                </button>

              </div>

              <div className="grid gap-4">

                {/* USERNAME */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Username
                  </label>

                  <input
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value)
                    }
                    className="w-full border rounded-lg p-3"
                  />
                </div>

                {/* FULL NAME */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Full Name
                  </label>

                  <input
                    value={fullName}
                    onChange={(e) =>
                      setFullName(e.target.value)
                    }
                    className="w-full border rounded-lg p-3"
                  />
                </div>

                {/* ROLE */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Role
                  </label>

                  <select
                    value={role}
                    onChange={(e) =>
                      setRole(e.target.value)
                    }
                    className="w-full border rounded-lg p-3"
                  >
                    {roles.map((item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                {/* BRANCH */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Branch
                  </label>

                  <select
                    value={branchId}
                    onChange={(e) =>
                      setBranchId(e.target.value)
                    }
                    className="w-full border rounded-lg p-3"
                  >
                    <option value="">
                      Select branch
                    </option>

                    {branches.map((branch) => (
                      <option
                        key={branch.id}
                        value={branch.id}
                      >
                        {branch.name}
                        {branch.city
                          ? ` - ${branch.city}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* PASSWORD */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Password{" "}
                    {selectedUser
                      ? "(leave empty to keep current)"
                      : ""}
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    className="w-full border rounded-lg p-3"
                    placeholder={
                      selectedUser
                        ? "New password"
                        : "Password"
                    }
                  />
                </div>

                {/* SIGNATURE */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Signature
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadSignature}
                    className="w-full border rounded-lg p-3"
                  />

                  {signature && (
                    <div className="mt-3">
                      <img
                        src={signature}
                        alt="Signature"
                        className="h-16 w-32 border rounded object-contain"
                      />
                    </div>
                  )}
                </div>

                {/* BUTTONS */}
                <div className="flex justify-end gap-3 pt-4">

                  <button
                    onClick={() => {
                      setOpenModal(false);
                      resetForm();
                    }}
                    className="px-5 py-3 rounded-lg border border-gray-300"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={saveUser}
                    className="px-5 py-3 rounded-lg bg-blue-700 text-white hover:bg-blue-800"
                  >
                    Save
                  </button>

                </div>

              </div>
            </div>
          </div>
        )}

      </main>
    </ProtectedRoute>
  );
}