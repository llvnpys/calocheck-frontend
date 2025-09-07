import { useState } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Map from "./components/Map";

export default function App() {
  const [filters, setFilters] = useState();

  const handleSearch = (f) => {
    // 추후 수정
    console.log("검색 실행:", f);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="flex">
        <Sidebar
          value={filters}
          onChange={setFilters}
          onSearch={handleSearch}
        />
        <main className="flex-1">
          <Map />
        </main>
      </div>
    </div>
  );
}
