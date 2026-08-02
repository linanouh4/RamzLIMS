"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function Dashboard() {

  const router = useRouter();

  const [user, setUser] = useState<any>(null);

  const [samplesCount, setSamplesCount] = useState(0);
  const [clientsCount, setClientsCount] = useState(0);
  const [projectsCount, setProjectsCount] = useState(0);
  const [testsCount, setTestsCount] = useState(0);

  const [recentSamples, setRecentSamples] = useState<any[]>([]);
  const [recentClients, setRecentClients] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);


  useEffect(() => {

    const savedUser = localStorage.getItem("user");

    if(savedUser){
      setUser(JSON.parse(savedUser));
    }

    loadDashboard();

  }, []);



  async function loadDashboard(){

    try{

      setLoading(true);


      const [
        {count:samples},
        {count:clients},
        {count:projects},
        {count:tests}

      ] = await Promise.all([

        supabase
        .from("samples")
        .select("*",{count:"exact",head:true}),


        supabase
        .from("clients")
        .select("*",{count:"exact",head:true}),


        supabase
        .from("projects")
        .select("*",{count:"exact",head:true}),


        supabase
        .from("tests")
        .select("*",{count:"exact",head:true})

      ]);



      setSamplesCount(samples || 0);
      setClientsCount(clients || 0);
      setProjectsCount(projects || 0);
      setTestsCount(tests || 0);



      const {data:samplesData}= await supabase
      .from("samples")
      .select("*")
      .order("created_at",{ascending:false})
      .limit(5);



      const {data:clientsData}= await supabase
      .from("clients")
      .select("*")
      .order("created_at",{ascending:false})
      .limit(5);



      setRecentSamples(samplesData || []);
      setRecentClients(clientsData || []);



    }catch(error){

      console.log(error);

    }finally{

      setLoading(false);

    }

  }



  function logout(){

    localStorage.removeItem("user");
    router.push("/");

  }



  return (

<ProtectedRoute>

<main className="min-h-screen bg-gray-100 flex">


<Sidebar user={user}/>


<section className="flex-1 p-8">


<div className="flex justify-between items-center mb-8">


<div>

<h1 className="text-3xl font-bold">
RamzLIMS Dashboard
</h1>


{user && (

<p className="text-gray-500 mt-2">
Welcome {user.full_name} | Role: {user.role}
</p>

)}

</div>



<button
onClick={logout}
className="bg-red-600 text-white px-5 py-2 rounded-lg"
>
Logout
</button>


</div>



{
loading ?

<div className="bg-white p-8 rounded-xl shadow">
Loading...
</div>


:


<>


<div className="grid grid-cols-2 lg:grid-cols-4 gap-6">


<div className="bg-white p-6 rounded-xl shadow">
<p>👥 Clients</p>
<h2 className="text-4xl font-bold mt-3">
{clientsCount}
</h2>
</div>


<div className="bg-white p-6 rounded-xl shadow">
<p>📁 Projects</p>
<h2 className="text-4xl font-bold mt-3">
{projectsCount}
</h2>
</div>



<div className="bg-white p-6 rounded-xl shadow">
<p>🧪 Samples</p>
<h2 className="text-4xl font-bold mt-3">
{samplesCount}
</h2>
</div>



<div className="bg-white p-6 rounded-xl shadow">
<p>🔬 Tests</p>
<h2 className="text-4xl font-bold mt-3">
{testsCount}
</h2>
</div>


</div>





<div className="grid md:grid-cols-2 gap-6 mt-8">


<div className="bg-white rounded-xl shadow p-6">


<h2 className="text-xl font-bold mb-4">
Latest Samples
</h2>


{
recentSamples.length === 0 ?

<p className="text-gray-500">
No samples found
</p>


:

recentSamples.map((sample,index)=>(

<div
key={index}
className="border-b py-3"
>

<p className="font-semibold">
{sample.name || "Sample"}
</p>


<p className="text-sm text-gray-500">
{sample.created_at}
</p>


</div>

))

}


</div>





<div className="bg-white rounded-xl shadow p-6">


<h2 className="text-xl font-bold mb-4">
Latest Clients
</h2>


{
recentClients.length === 0 ?

<p className="text-gray-500">
No clients found
</p>


:

recentClients.map((client,index)=>(

<div
key={index}
className="border-b py-3"
>


<p className="font-semibold">
{client.name || "Client"}
</p>


<p className="text-sm text-gray-500">
{client.created_at}
</p>


</div>

))

}



</div>


</div>



</>

}


</section>


</main>

</ProtectedRoute>

  );

}
