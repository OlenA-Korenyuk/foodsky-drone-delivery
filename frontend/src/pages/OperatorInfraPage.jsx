import { useState } from "react";
import OperatorRestaurantManager from "../components/OperatorRestaurantManager";
import OperatorNFZManager from "../components/OperatorNFZManager";

function OperatorInfraPage({ token }) {
  const [activeTab, setActiveTab] = useState("restaurants");

  return (
    <div className="animate-sys-fade">
      {/* Таб-перемикач */}
      <div className="flex gap-0 mb-6 border border-border-color w-fit">
        <button
          onClick={() => setActiveTab("restaurants")}
          className={`text-[10px] font-bold uppercase tracking-widest px-5 py-2.5 transition-all cursor-pointer border-r border-border-color ${
            activeTab === "restaurants"
              ? "bg-accent-primary text-bg-main"
              : "bg-bg-card text-text-muted hover:text-text-main hover:bg-bg-main"
          }`}
        >
          🍽 Ресторани та меню
        </button>
        <button
          onClick={() => setActiveTab("nfz")}
          className={`text-[10px] font-bold uppercase tracking-widest px-5 py-2.5 transition-all cursor-pointer ${
            activeTab === "nfz"
              ? "bg-danger text-white"
              : "bg-bg-card text-text-muted hover:text-text-main hover:bg-bg-main"
          }`}
        >
          🚫 Зони NFZ
        </button>
      </div>

      {activeTab === "restaurants" && (
        <OperatorRestaurantManager token={token} />
      )}
      {activeTab === "nfz" && <OperatorNFZManager token={token} />}
    </div>
  );
}

export default OperatorInfraPage;
