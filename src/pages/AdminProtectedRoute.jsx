import { Navigate } from "react-router-dom";

const AdminProtectedRoute = ({children})=>{

const isAdmin = localStorage.getItem("adminAuth");

return isAdmin ? children : <Navigate to="/admin-login"/>

}

export default AdminProtectedRoute;