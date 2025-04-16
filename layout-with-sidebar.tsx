import { ReactNode } from "react";
import { Layout } from "./layout";
import Sidebar from "./Sidebar";

interface LayoutWithSidebarProps {
  children: ReactNode;
}

export function LayoutWithSidebar({ children }: LayoutWithSidebarProps) {
  return (
    <Layout>
      <div className="flex">
        <Sidebar isVisible={true} />
        <div className="flex-1 ml-64 p-6">
          {children}
        </div>
      </div>
    </Layout>
  );
}