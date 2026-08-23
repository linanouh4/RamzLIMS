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

  // =========================
  // LOAD PROJECTS ON PAGE LOAD
  // =========================

  useEffect(() => {
    loadProjects();
  }, []);

  // =========================
  // LOAD PROJECTS
  // =========================

  async function loadProjects() {
    setLoading(true);

    try {
      // =========================
      // GET SAVED USER
      // =========================

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

      // =========================
      // LOAD CURRENT USER
      // =========================

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
        role: userData.role,
        branch_id:
          userData.branch_id != null
            ? Number(userData.branch_id)
            : null,
      };

      setCurrentUser(current);

      // =========================
      // DEBUG
      // =========================

      console.log("CURRENT USER:", current);

      // =========================
      // LOAD PROJECTS
      // =========================

      let query = supabase
        .from("projects")
        .select("*")
        .order("id", {
          ascending: false,
        });

      /*
       * ADMIN:
       * يشاهد جميع المشاريع.
       *
       * BRANCH MANAGER:
       * يشاهد مشاريع فرعه فقط.
       *
       * باقي المستخدمين:
       * يشاهدون المشاريع التابعة لفرعهم.
       */

      if (current.role === "admin") {
        // Admin sees all projects
      } else {
        if (current.branch_id === null) {
          alert(
            "المستخدم الحالي غير مرتبط بأي فرع."
          );

          setProjects([]);
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
          "LOAD PROJECTS ERROR:",
          error
        );

        alert(error.message);
        return;
      }

      // =========================
      // DEBUG
      // =========================

      console.log("PROJECTS:", data);

      setProjects(data || []);
    } catch (error: any) {
      console.error(
        "PROJECTS PAGE ERROR:",
        error
      );

      alert(
        "حدث خطأ أثناء تحميل المشاريع:\n" +
          (error?.message ||
            "خطأ غير معروف")
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // ADD PROJECT
  // =========================

  async function addProject() {
    if (!projectName.trim()) {
      alert("Please enter project name");
      return;
    }

    if (!currentUser) {
      alert(
        "لم يتم التعرف على المستخدم الحالي."
      );
      return;
    }

    /*
     * Admin يمكنه إنشاء مشروع بدون فرع
     * إذا كان branch_id غير موجود.
     *
     * باقي المستخدمين يجب أن يكونوا
     * مرتبطين بفرع.
     */

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
    // CREATE PROJECT OBJECT
    // =========================

    const newProject: any = {
      project_name: projectName,
      project_number: projectNumber,
      location,
      project_status: status,
      description,
    };

    /*
     * كل مستخدم مرتبط بفرع:
     * المشروع يأخذ branch_id الخاص به.
     */

    if (currentUser.branch_id !== null) {
      newProject.branch_id =
        currentUser.branch_id;
    }

    // =========================
    // DEBUG
    // =========================

    console.log(
      "NEW PROJECT:",
      newProject
    );

    // =========================
    // INSERT PROJECT
    // =========================

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

      alert(error.message);
      return;
    }

    // =========================
    // RESET FORM
    // =========================

    setProjectName("");
    setProjectNumber("");
    setLocation("");
    setStatus("Active");
    setDescription("");

    // =========================
    // RELOAD PROJECTS
    // =========================

    await loadProjects();
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

    const project = projects.find(
      (item) =>
        Number(item.id) === Number(id)
    );

    if (!project) {
      alert("المشروع غير موجود.");
      return;
    }

    /*
     * Admin:
     * يستطيع حذف أي مشروع.
     *
     * Branch Manager:
     * يستطيع حذف مشروع فرعه فقط.
     */

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
        "Delete this project?"
      )
    ) {
      return;
    }

    let query = supabase
      .from("projects")
      .delete()
      .eq("id", id);

    /*
     * Admin:
     * بدون فلترة فرع.
     *
     * باقي المستخدمين:
     * الحذف من فرعهم فقط.
     */

    if (currentUser.role !== "admin") {
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

      alert(error.message);
      return;
    }

    await loadProjects();
  }

  // =========================
  // PAGE
  // =========================

  return (
    <ProtectedRoute>
      <div className="p-8">

        {/* =========================
            HEADER
        ========================= */}

        <div className="flex items-center gap-3 mb-8">

          <button
            onClick={() => {
              if (
                window.history.length > 1
              ) {
                router.back();
              } else {
                router.push(
                  "/dashboard"
                );
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
              {currentUser?.role ===
              "branch_manager"
                ? "Manage projects for your branch."
                : "Manage all company projects."}
            </p>

          </div>

        </div>

        {/* =========================
            ADD PROJECT
        ========================= */}

        <div className="bg-white rounded-xl shadow p-6 mb-8">

          <div className="grid grid-cols-2 gap-4">

            <input
              className="border rounded-lg p-3"
              placeholder="Project Name"
              value={projectName}
              onChange={(e) =>
                setProjectName(
                  e.target.value
                )
              }
            />

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

            <select
              className="border rounded-lg p-3"
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value
                )
              }
            >
              <option>
                Active
              </option>

              <option>
                Completed
              </option>

              <option>
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
              setDescription(
                e.target.value
              )
            }
          />

          <button
            onClick={addProject}
            className="mt-5 bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-lg"
          >
            + Add Project
          </button>

        </div>

        {/* =========================
            PROJECTS TABLE
        ========================= */}

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

                {projects.map(
                  (project) => (

                    <tr
                      key={project.id}
                      className="border-t"
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
                          {
                            project.project_status
                          }
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

                  )
                )}

              </tbody>

            </table>

          )}

        </div>

      </div>
    </ProtectedRoute>
  );
}