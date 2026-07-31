"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ProjectsPage() {
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

    const { error } = await supabase
      .from("projects")
      .insert([
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

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadProjects();
  }

  return (
    <div className="p-8">

      <h1 className="text-3xl font-bold mb-8">
        Projects
      </h1>

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
                <th className="p-3 text-left">Project</th>
                <th className="p-3 text-left">Number</th>
                <th className="p-3 text-left">Location</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Actions</th>
              </tr>

            </thead>

            <tbody>

              {projects.map((project) => (

                <tr
                  key={project.id}
                  className="border-t"
                >

                  <td className="p-3">
                    {project.project_name}
                  </td>

                  <td className="p-3">
                    {project.project_number}
                  </td>

                  <td className="p-3">
                    {project.location}
                  </td>

                  <td className="p-3">
                    {project.project_status}
                  </td>

                  <td className="p-3">

                    <button
                      onClick={() => deleteProject(project.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                    >
                      Delete
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>
        )}

      </div>

    </div>
  );
}
