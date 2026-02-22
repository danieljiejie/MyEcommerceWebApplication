import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import CartView from './pages/CartView';
import Login from './pages/Login';
import Register from './pages/Register';
import Account from './pages/Account';
import ProtectedRoute from './components/ProtectedRoute';
import { CartProvider } from './context/CartContext';
import ProductDetail from './components/ProductDetail';
import Checkout from './components/Checkout';
import ForgotPassword from './pages/ForgotPassword';


function AppContent() {
  const [search, setSearch] = useState("");
  const location = useLocation();
  
  // Don't show header on auth pages
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="min-h-screen bg-gray-50">
      {!isAuthPage && <Header onSearch={setSearch} />}
      <main className={!isAuthPage ? "py-6" : ""}>

        <Routes>
          <Route path="/" element={<Home search={search} />} />
          <Route path="/cart" element={<CartView />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/checkout" element={<Checkout />} />
          {/* PROTECTED ROUTE */}
          <Route 
              path="/account" 
              element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              } 
            />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/forgot-password" element={<ForgotPassword/>} />

            
        </Routes>


      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

// import { useState } from 'react';
// import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
// import { CartProvider } from './context/CartContext';
// import Header from './components/Header';
// import Home from './pages/Home';
// import CartView from './pages/CartView';
// import ProductDetail from './pages/ProductDetail';

// function AppContent() {
//   const [search, setSearch] = useState("");
//   const location = useLocation();

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <Header onSearch={setSearch} />
//       <main className="py-6">
//         <Routes>
//           <Route path="/" element={<Home search={search} />} />
//           <Route path="/cart" element={<CartView />} />
//           <Route path="/product/:id" element={<ProductDetail />} />
//         </Routes>
//       </main>
//     </div>
//   );
// }

// export default function App() {
//   return (
//     <Router>
//       <CartProvider>
//         <AppContent />
//       </CartProvider>
//     </Router>
//   );
// }