import { useState } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Map from "./components/Map";

export default function App() {
  const [searchParams, setSearchParams] = useState(null);
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="flex">
        <Sidebar setSearchParams={setSearchParams} />
        <main className="flex-1">
          <Map searchParams={searchParams} />
        </main>
      </div>
    </div>
  );
}
