"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import { getSavedUser } from "@/lib/auth";

type CurrentUser = {
  id: number;
  role: string;
  branch_id: number | null;
};

export default function ProjectsPage() {
  const router = useRouter();

  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [projectName, setProjectName] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("Active");
  const [description, setDescription] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);

    try {
      const savedUser = getSavedUser();

      if (!savedUser) {
        router.push("/");
        return;
      }

      const userId = Number(savedUser.id);

      if (!userId) {
        alert("بيانات المستخدم الحالي غير صحيحة");
        return;
      }

      const { data: userData, error: userError } =
        await supabase
          .from("users")
          .select("id, role, branch_id")
          .eq("id", userId)
          .single();

      if (userError || !userData) {
        console.error("LOAD CURRENT USER ERROR:", userError);

        alert(
          "تعذر تحميل بيانات المستخدم:\n" +
            (userError?.message || "المستخدم غير موجود")
        );

        return;
      }

      const current: CurrentUser = {
        id: Number(userData.id),
        role: String(userData.role || "")
          .trim()
          .toLowerCase(),
        branch_id:
          userData.branch_id !== null &&
          userData.branch_id !== undefined
            ? Number(userData.branch_id)
            : null,
      };

      setCurrentUser(current);

      console.log("CURRENT USER:", current);

      let query = supabase
        .from("projects")
        .select("*")
        .order("id", { ascending: false });

      // ADMIN يشوف جميع المشاريع
      // أي مستخدم آخر يشوف مشاريع فرعه فقط
      if (current.role !== "admin") {
        if (current.branch_id === null) {
          alert("المستخدم الحالي غير مرتبط بأي فرع.");
          setProjects([]);
          return;
        }

        query = query.eq("branch_id", current.branch_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error("LOAD PROJECTS ERROR:", error);
        alert(error.message);
        return;
      }

      console.log("PROJECTS:", data);

      setProjects(data || []);
    } catch (error: any) {
      console.error("PROJECTS PAGE ERROR:", error);

      alert(
        "حدث خطأ أثناء تحميل المشاريع:\n" +
          (error?.message || "خطأ غير معروف")
      );
    } finally {
      setLoading(false);
    }
  }

  async function addProject() {
    if (!projectName.trim()) {
      alert("Please enter project name");
      return;
    }

    if (!currentUser) {
      alert("لم يتم التعرف على المستخدم الحالي.");
      return;
    }

    if (
      currentUser.role !== "admin" &&
      currentUser.branch_id === null
    ) {
      alert("المستخدم الحالي غير مرتبط بأي فرع.");
      return;
    }

    const newProject: any = {
      project_name: projectName.trim(),
      project_number: projectNumber.trim(),
      location: location.trim(),
      project_status: status,
      description: description.trim(),
    };

    // ADMIN يمكنه إنشاء مشروع بدون فرع
    // مدير الفرع ينشئ المشروع تلقائيًا على فرعه
    if (currentUser.branch_id !== null) {
      newProject.branch_id = currentUser.branch_id;
    }

    console.log("NEW PROJECT:", newProject);

    const { error } = await supabase
      .from("projects")
      .insert([newProject]);

    if (error) {
      console.error("ADD PROJECT ERROR:", error);
      alert(error.message);
      return;
    }

    setProjectName("");
    setProjectNumber("");
    setLocation("");
    setStatus("Active");
    setDescription("");

    await loadProjects();
  }

  async function deleteProject(id: number) {
    if (!currentUser) {
      alert("لم يتم التعرف على المستخدم الحالي.");
      return;
    }

    const project = projects.find(
      (item) => Number(item.id) === Number(id)
    );

    if (!project) {
      alert("المشروع غير موجود.");
      return;
    }

    // منع حذف مشروع تابع لفرع آخر
    if (
      currentUser.role !== "admin" &&
      Number(project.branch_id) !==
        Number(currentUser.branch_id)
    ) {
      alert("لا يمكنك حذف مشروع تابع لفرع آخر.");
      return;
    }

    if (!confirm("Delete this project?")) {
      return;
    }

    let query = supabase
      .from("projects")
      .delete()
      .eq("id", id);

    // ADMIN يحذف من أي فرع
    // غير ADMIN يحذف فقط من فرعه
    if (currentUser.role !== "admin") {
      query = query.eq(
        "branch_id",
        currentUser.branch_id
      );
    }

    const { error } = await query;

    if (error) {
      console.error("DELETE PROJECT ERROR:", error);
      alert(error.message);
      return;
    }

    await loadProjects();
  }

  return (
    <ProtectedRoute>
      <div className="p-8">
        {/* HEADER */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push("/dashboard");
              }
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Back
          </button>

          <div>
            <h1 className="text-3xl font-bold">
              Projects
            </h1>

            <p className="text-gray-500 mt-1">
              {currentUser?.role === "branch_manager"
                ? "Manage projects for your branch."
                : currentUser?.role === "admin"
                ? "Manage all company projects."
                : "Manage projects for your branch."}
            </p>
          </div>
        </div>

        {/* ADD PROJECT */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <div className="grid grid-cols-2 gap-4">
            <input
              className="border rounded-lg p-3"
              placeholder="Project Name"
              value={projectName}
              onChange={(e) =>
                setProjectName(e.target.value)
              }
            />

            <input
              className="border rounded-lg p-3"
              placeholder="Project Number"
              value={projectNumber}
              onChange={(e) =>
                setProjectNumber(e.target.value)
              }
            />

            <input
              className="border rounded-lg p-3"
              placeholder="Location"
              value={location}
              onChange={(e) =>
                setLocation(e.target.value)
              }
            />

            <select
              className="border rounded-lg p-3"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value)
              }
            >
              <option value="Active">Active</option>
              <option value="Completed">
                Completed
              </option>
              <option value="On Hold">
                On Hold
              </option>
            </select>
          </div>

          <textarea
            className="border rounded-lg p-3 w-full mt-4"
            rows={4}
            placeholder="Description"
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
          />

          <button
            onClick={addProject}
            className="mt-5 bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-lg"
          >
            + Add Project
          </button>
        </div>

        {/* PROJECTS TABLE */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-6 text-center">
              Loading...
            </div>
          ) : projects.length === 0 ? (
            <div className="p-6 text-center">
              No projects found
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">
                    Project
                  </th>

                  <th className="p-3 text-left">
                    Number
                  </th>

                  <th className="p-3 text-left">
                    Location
                  </th>

                  <th className="p-3 text-left">
                    Status
                  </th>

                  <th className="p-3 text-left">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {projects.map((project) => (
                  <tr
                    key={project.id}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="p-3 font-semibold">
                      {project.project_name}
                    </td>

                    <td className="p-3">
                      {project.project_number}
                    </td>

                    <td className="p-3">
                      {project.location}
                    </td>

                    <td className="p-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm text-white ${
                          project.project_status ===
                          "Active"
                            ? "bg-green-600"
                            : project.project_status ===
                              "Completed"
                            ? "bg-blue-600"
                            : "bg-yellow-600"
                        }`}
                      >
                        {project.project_status}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            router.push(
                              `/projects/${project.id}`
                            )
                          }
                          className="bg-green-700 hover:bg-green-800 text-white px-3 py-1 rounded"
                        >
                          Open
                        </button>

                        <button
                          onClick={() =>
                            deleteProject(
                              Number(project.id)
                            )
                          }
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}