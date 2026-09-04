import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, Shield } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase";
import { collection, addDoc } from "firebase/firestore";

const ADMIN_UID = "6lNLWrSuckXasyipSoxqO9ndOHm1";

const AdminLogin = () => {

  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [showPassword,setShowPassword] = useState(false);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e)=>{
    e.preventDefault();

    setError("");
    setLoading(true);

    try{

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      // UID check
      if(user.uid !== ADMIN_UID){
        setError("You are not authorized as admin");
        await auth.signOut();
        return;
      }

      // Firestore admin collection create + store data
      await addDoc(collection(db,"admin"),{
        uid:user.uid,
        email:user.email,
        name:"Admin",
        bio:"",
        phone:"",
        department:"Admin",
        loginTime:new Date()
      });

      localStorage.setItem("adminAuth","true");
      localStorage.setItem("adminUID",user.uid);
      localStorage.setItem("adminEmail",user.email);

      navigate("/");

    }catch(err){

      console.error(err);

      setError("Invalid email or password");

    }finally{

      setLoading(false);

    }

  };

  return (

<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">

<div className="w-full max-w-md">

<div className="text-center mb-8">

<div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
<Shield className="text-white" size={32}/>
</div>

<h1 className="text-3xl font-bold text-gray-900">Admin Portal</h1>
<p className="text-gray-600">Secure Admin Login</p>

</div>

<div className="bg-white rounded-2xl shadow-xl p-8">

{error && (
<div className="mb-4 text-red-600 text-sm">
{error}
</div>
)}

<form onSubmit={handleLogin} className="space-y-6">

<div>
<label className="text-sm font-medium text-gray-700">
Email
</label>

<div className="relative">

<Mail className="absolute left-3 top-3 text-gray-400"/>

<input
type="email"
placeholder="admin@email.com"
value={email}
onChange={(e)=>setEmail(e.target.value)}
className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
required
/>

</div>

</div>

<div>

<label className="text-sm font-medium text-gray-700">
Password
</label>

<div className="relative">

<Lock className="absolute left-3 top-3 text-gray-400"/>

<input
type={showPassword ? "text":"password"}
placeholder="Password"
value={password}
onChange={(e)=>setPassword(e.target.value)}
className="w-full pl-10 pr-10 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
required
/>

<button
type="button"
onClick={()=>setShowPassword(!showPassword)}
className="absolute right-3 top-3 text-gray-500"
>

{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}

</button>

</div>

</div>

<button
type="submit"
disabled={loading}
className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700"
>

{loading ? "Signing in..." : "Sign In"}

</button>

</form>

</div>

</div>

</div>

  );
};

export default AdminLogin;