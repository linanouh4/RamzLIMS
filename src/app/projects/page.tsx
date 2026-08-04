"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";

export default function ProjectsPage() {
  const router = useRouter();

  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setProjects(data || []);
    setLoading(false);
  }

  async function addProject() {
    if (!projectName) {
      alert("Please enter project name");
      return;
    }

    const { error } = await supabase.from("projects").insert([
      {
        project_name: projectName,
        project_number: projectNumber,
        location,
        project_status: status,
        description,
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setProjectName("");
    setProjectNumber("");
    setLocation("");
    setStatus("Active");
    setDescription("");

    loadProjects();
  }

  async function deleteProject(id: number) {
    if (!confirm("Delete this project?")) return;

    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadProjects();
  }

  return (
    <ProtectedRoute>
      <div className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => window.history.back()}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold">Projects</h1>
        </div>

        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <div className="grid grid-cols-2 gap-4">
            <input
              className="border rounded-lg p-3"
              placeholder="Project Name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
            <input
              className="border rounded-lg p-3"
              placeholder="Project Number"
              value={projectNumber}
              onChange={(e) => setProjectNumber(e.target.value)}
            />
            <input
              className="border rounded-lg p-3"
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <select
              className="border rounded-lg p-3"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option>Active</option>
              <option>Completed</option>
              <option>On Hold</option>
            </select>
          </div>

          <textarea
            className="border rounded-lg p-3 w-full mt-4"
            rows={4}
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <button
            onClick={addProject}
            className="mt-5 bg-blue-700 hover:bg-blue-800 text-white px-5 py-3 rounded-lg"
          >
            + Add Project
          </button>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-6 text-center">Loading...</div>
          ) : projects.length === 0 ? (
            <div className="p-6 text-center">No projects found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Project</th>
                  <th className="p-3 text-left">Number</th>
                  <th className="p-3 text-left">Location</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-t">
                    <td className="p-3 font-semibold">{project.project_name}</td>
                    <td className="p-3">{project.project_number}</td>
                    <td className="p-3">{project.location}</td>
                    <td className="p-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm text-white ${
                          project.project_status === "Active"
                            ? "bg-green-600"
                            : project.project_status === "Completed"
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
                          onClick={() => router.push(`/projects/${project.id}`)}
                          className="bg-green-700 hover:bg-green-800 text-white px-3 py-1 rounded"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => deleteProject(project.id)}
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
