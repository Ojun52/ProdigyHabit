'use client';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ScoreChartProps {
  logs: { date: string; score: number }[];
}

const ScoreChart = ({ logs }: ScoreChartProps) => {
  const data: ChartData<'bar'> = {
    labels: logs.map(log => new Date(log.date).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' })),
    datasets: [
      {
        label: '生産性スコア',
        data: logs.map(log => log.score),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#E5E7EB', // text-gray-200
        },
      },
      title: {
        display: true,
        text: '週間生産性スコア',
        color: '#F3F4F6', // text-gray-100
        font: {
          size: 16,
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          color: '#D1D5DB', // text-gray-300
        },
        grid: {
          color: '#374151', // gray-700
        },
      },
      x: {
        ticks: {
          color: '#D1D5DB', // text-gray-300
        },
        grid: {
          color: '#374151', // gray-700
        },
      },
    },
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg h-80">
      <Bar options={options} data={data} />
    </div>
  );
};

export default ScoreChart;
