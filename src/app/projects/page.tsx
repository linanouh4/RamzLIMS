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
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [projectName, setProjectName] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("Active");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    initializePage();
  }, []);

  // =========================
  // INITIALIZE
  // =========================

  async function initializePage() {
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

      const {
        data: userData,
        error: userError,
      } = await supabase
        .from("users")
        .select("id, role, branch_id")
        .eq("id", userId)
        .single();

      if (userError || !userData) {
        console.error(
          "LOAD CURRENT USER ERROR:",
          userError
        );

        alert(
          "تعذر تحميل بيانات المستخدم:\n" +
            (userError?.message ||
              "المستخدم غير موجود")
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

      // مهم:
      // ننتظر معرفة المستخدم أولًا
      // ثم نحمل العملاء والمشاريع حسب الفرع.

      await loadClients(current);
      await loadProjects(current);
    } catch (error: any) {
      console.error(
        "PROJECTS PAGE ERROR:",
        error
      );

      alert(
        "حدث خطأ أثناء تحميل الصفحة:\n" +
          (error?.message || "خطأ غير معروف")
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // LOAD CLIENTS
  // =========================

  async function loadClients(
    current: CurrentUser
  ) {
    try {
      let query = supabase
        .from("clients")
        .select("id, client_name, branch_id")
        .order("client_name", {
          ascending: true,
        });

      // ADMIN يشوف جميع العملاء
      // مدير الفرع يشوف عملاء فرعه فقط

      if (current.role !== "admin") {
        if (current.branch_id === null) {
          alert(
            "المستخدم الحالي غير مرتبط بأي فرع."
          );

          setClients([]);
          return;
        }

        query = query.eq(
          "branch_id",
          current.branch_id
        );
      }

      const {
        data,
        error,
      } = await query;

      if (error) {
        console.error(
          "LOAD CLIENTS ERROR:",
          error
        );

        alert(
          "تعذر تحميل العملاء:\n" +
            error.message
        );

        return;
      }

      console.log(
        "CLIENTS FOR CURRENT USER:",
        data
      );

      setClients(data || []);
    } catch (error: any) {
      console.error(
        "LOAD CLIENTS EXCEPTION:",
        error
      );

      alert(
        "حدث خطأ أثناء تحميل العملاء:\n" +
          (error?.message || "خطأ غير معروف")
      );
    }
  }

  // =========================
  // LOAD PROJECTS
  // =========================

  async function loadProjects(
    current?: CurrentUser
  ) {
    try {
      let user = current;

      if (!user) {
        const savedUser = getSavedUser();

        if (!savedUser) {
          router.push("/");
          return;
        }

        const userId = Number(savedUser.id);

        const {
          data: userData,
          error: userError,
        } = await supabase
          .from("users")
          .select("id, role, branch_id")
          .eq("id", userId)
          .single();

        if (userError || !userData) {
          alert(
            "تعذر تحميل بيانات المستخدم."
          );
          return;
        }

        user = {
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
      }

      let query = supabase
        .from("projects")
        .select("*")
        .order("id", {
          ascending: false,
        });

      // ADMIN يشوف جميع المشاريع
      // مدير الفرع يشوف مشاريع فرعه فقط

      if (user.role !== "admin") {
        if (user.branch_id === null) {
          alert(
            "المستخدم الحالي غير مرتبط بأي فرع."
          );

          setProjects([]);
          return;
        }

        query = query.eq(
          "branch_id",
          user.branch_id
        );
      }

      const {
        data,
        error,
      } = await query;

      if (error) {
        console.error(
          "LOAD PROJECTS ERROR:",
          error
        );

        alert(
          "تعذر تحميل المشاريع:\n" +
            error.message
        );

        return;
      }

      console.log(
        "PROJECTS FOR CURRENT USER:",
        data
      );

      setProjects(data || []);
    } catch (error: any) {
      console.error(
        "LOAD PROJECTS EXCEPTION:",
        error
      );

      alert(
        "حدث خطأ أثناء تحميل المشاريع:\n" +
          (error?.message || "خطأ غير معروف")
      );
    }
  }

  // =========================
  // ADD PROJECT
  // =========================

  async function addProject() {
    if (!projectName.trim()) {
      alert(
        "الرجاء إدخال اسم المشروع"
      );
      return;
    }

    if (!clientId) {
      alert(
        "الرجاء اختيار العميل."
      );
      return;
    }

    if (!currentUser) {
      alert(
        "لم يتم التعرف على المستخدم الحالي."
      );
      return;
    }

    if (
      currentUser.role !== "admin" &&
      currentUser.branch_id === null
    ) {
      alert(
        "المستخدم الحالي غير مرتبط بأي فرع."
      );
      return;
    }

    // =========================
    // حماية إضافية:
    // التأكد أن العميل من نفس فرع المستخدم
    // =========================

    const selectedClient =
      clients.find(
        (client) =>
          Number(client.id) ===
          Number(clientId)
      );

    if (!selectedClient) {
      alert(
        "العميل غير موجود أو غير تابع لفرعك."
      );
      return;
    }

    if (
      currentUser.role !== "admin" &&
      Number(selectedClient.branch_id) !==
        Number(currentUser.branch_id)
    ) {
      alert(
        "لا يمكنك إنشاء مشروع لعميل تابع لفرع آخر."
      );
      return;
    }

    const newProject: any = {
      project_name:
        projectName.trim(),

      project_number:
        projectNumber.trim(),

      location:
        location.trim(),

      project_status:
        status,

      description:
        description.trim(),

      client_id:
        Number(clientId),
    };

    // ADMIN:
    // إذا كان مرتبطًا بفرع، يحفظ المشروع على فرعه.
    //
    // مدير الفرع:
    // دائمًا يحفظ المشروع على فرعه.

    if (
      currentUser.branch_id !== null
    ) {
      newProject.branch_id =
        currentUser.branch_id;
    }

    console.log(
      "NEW PROJECT:",
      newProject
    );

    const {
      error,
    } = await supabase
      .from("projects")
      .insert([newProject]);

    if (error) {
      console.error(
        "ADD PROJECT ERROR:",
        error
      );

      alert(
        "حدث خطأ أثناء إنشاء المشروع:\n" +
          error.message
      );

      return;
    }

    alert(
      "تم إنشاء المشروع وربطه بالعميل بنجاح."
    );

    // Reset form

    setProjectName("");
    setProjectNumber("");
    setLocation("");
    setStatus("Active");
    setDescription("");
    setClientId("");

    await loadProjects(currentUser);
  }

  // =========================
  // DELETE PROJECT
  // =========================

  async function deleteProject(
    id: number
  ) {
    if (!currentUser) {
      alert(
        "لم يتم التعرف على المستخدم الحالي."
      );
      return;
    }

    const project =
      projects.find(
        (item) =>
          Number(item.id) ===
          Number(id)
      );

    if (!project) {
      alert(
        "المشروع غير موجود."
      );
      return;
    }

    // مدير الفرع لا يستطيع حذف مشروع من فرع آخر

    if (
      currentUser.role !== "admin" &&
      Number(project.branch_id) !==
        Number(currentUser.branch_id)
    ) {
      alert(
        "لا يمكنك حذف مشروع تابع لفرع آخر."
      );
      return;
    }

    if (
      !confirm(
        "هل أنت متأكد من حذف هذا المشروع؟"
      )
    ) {
      return;
    }

    let query = supabase
      .from("projects")
      .delete()
      .eq("id", id);

    // ADMIN يحذف من أي فرع
    // غير ADMIN يحذف فقط من فرعه

    if (
      currentUser.role !== "admin"
    ) {
      query = query.eq(
        "branch_id",
        currentUser.branch_id
      );
    }

    const {
      error,
    } = await query;

    if (error) {
      console.error(
        "DELETE PROJECT ERROR:",
        error
      );

      alert(
        "حدث خطأ أثناء حذف المشروع:\n" +
          error.message
      );

      return;
    }

    await loadProjects(currentUser);
  }

  // =========================
  // OPEN PROJECT
  // =========================

  function openProject(
    projectId: number
  ) {
    router.push(
      `/projects/${projectId}`
    );
  }

  // =========================
  // MAIN
  // =========================

  return (
    <ProtectedRoute>
      <div className="p-8 min-h-screen bg-gray-100">

        {/* HEADER */}

        <div className="flex items-center gap-3 mb-8">

          <button
            onClick={() =>
              router.push("/dashboard")
            }
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Back
          </button>

          <div>

            <h1 className="text-3xl font-bold">
              Projects
            </h1>

            <p className="text-gray-500 mt-1">
              {currentUser?.role ===
              "branch_manager"
                ? "Manage projects for your branch."
                : currentUser?.role ===
                  "admin"
                ? "Manage all company projects."
                : "Manage projects for your branch."}
            </p>

          </div>

        </div>

        {/* ADD PROJECT */}

        <div className="bg-white rounded-xl shadow p-6 mb-8">

          <h2 className="text-xl font-bold text-blue-900 mb-5">
            إنشاء مشروع جديد
          </h2>

          <div className="grid grid-cols-2 gap-4">

            {/* CLIENT */}

            <select
              className="border rounded-lg p-3"
              value={clientId}
              onChange={(e) =>
                setClientId(
                  e.target.value
                )
              }
            >
              <option value="">
                اختر العميل *
              </option>

              {clients.map(
                (client) => (
                  <option
                    key={client.id}
                    value={client.id}
                  >
                    {client.client_name}{" "}
                    - ID: {client.id}
                  </option>
                )
              )}

            </select>

            {/* PROJECT NAME */}

            <input
              className="border rounded-lg p-3"
              placeholder="Project Name *"
              value={projectName}
              onChange={(e) =>
                setProjectName(
                  e.target.value
                )
              }
            />

            {/* PROJECT NUMBER */}

            <input
              className="border rounded-lg p-3"
              placeholder="Project Number"
              value={projectNumber}
              onChange={(e) =>
                setProjectNumber(
                  e.target.value
                )
              }
            />

            {/* LOCATION */}

            <input
              className="border rounded-lg p-3"
              placeholder="Location"
              value={location}
              onChange={(e) =>
                setLocation(
                  e.target.value
                )
              }
            />

            {/* STATUS */}

            <select
              className="border rounded-lg p-3"
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value
                )
              }
            >
              <option value="Active">
                Active
              </option>

              <option value="Completed">
                Completed
              </option>

              <option value="On Hold">
                On Hold
              </option>
            </select>

          </div>

          {/* DESCRIPTION */}

          <textarea
            className="border rounded-lg p-3 w-full mt-4"
            rows={4}
            placeholder="Description"
            value={description}
            onChange={(e) =>
              setDescription(
                e.target.value
              )
            }
          />

          {/* BUTTON */}

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

            <div className="p-6 text-center text-gray-500">
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
                    Client
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

                {projects.map(
                  (project) => {

                    const client =
                      clients.find(
                        (item) =>
                          Number(
                            item.id
                          ) ===
                          Number(
                            project.client_id
                          )
                      );

                    return (

                      <tr
                        key={project.id}
                        className="border-t hover:bg-gray-50"
                      >

                        {/* PROJECT */}

                        <td className="p-3 font-semibold">
                          {
                            project.project_name
                          }
                        </td>

                        {/* CLIENT */}

                        <td className="p-3">

                          {client
                            ?.client_name ||
                            "غير محدد"}

                        </td>

                        {/* NUMBER */}

                        <td className="p-3">
                          {
                            project.project_number ||
                            "-"
                          }
                        </td>

                        {/* LOCATION */}

                        <td className="p-3">
                          {
                            project.location ||
                            "-"
                          }
                        </td>

                        {/* STATUS */}

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
                            {
                              project.project_status
                            }
                          </span>

                        </td>

                        {/* ACTIONS */}

                        <td className="p-3">

                          <div className="flex gap-2">

                            <button
                              onClick={() =>
                                openProject(
                                  Number(
                                    project.id
                                  )
                                )
                              }
                              className="bg-green-700 hover:bg-green-800 text-white px-3 py-1 rounded"
                            >
                              Open
                            </button>

                            <button
                              onClick={() =>
                                deleteProject(
                                  Number(
                                    project.id
                                  )
                                )
                              }
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                            >
                              Delete
                            </button>

                          </div>

                        </td>

                      </tr>

                    );
                  }
                )}

              </tbody>

            </table>

          )}

        </div>

      </div>
    </ProtectedRoute>
  );
}