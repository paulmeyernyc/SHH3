import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from "chart.js";
import { Line, Bar, Pie } from "react-chartjs-2";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Set default styles
ChartJS.defaults.color = "#a1a1aa"; // text color
ChartJS.defaults.borderColor = "rgba(255, 255, 255, 0.1)"; // grid lines

interface ChartProps {
  data: ChartData<any, any>;
  options?: ChartOptions<any>;
  height?: number;
  width?: number;
}

export function LineChart({ data, options, height, width }: ChartProps) {
  return <Line data={data} options={options} height={height} width={width} />;
}

export function BarChart({ data, options, height, width }: ChartProps) {
  return <Bar data={data} options={options} height={height} width={width} />;
}

export function PieChart({ data, options, height, width }: ChartProps) {
  return <Pie data={data} options={options} height={height} width={width} />;
}