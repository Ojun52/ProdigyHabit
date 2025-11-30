'use client';

import { useState, useEffect } from 'react';
import { XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';
import api from '@/lib/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ActivityData {
  date: string;
  score?: number;
  sleep_hours?: number;
  screen_time?: number;
  mood?: number;
}

const getWeekRange = (date: Date) => {
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Calculate the difference to Monday (1st day of the week)
  const diff = day === 0 ? 6 : day - 1; // Number of days to subtract to get to Monday

  startOfWeek.setDate(startOfWeek.getDate() - diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
  endOfWeek.setHours(23, 59, 59, 999);

  return { startOfWeek, endOfWeek };
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function WeeklySummaryChart() {
  const [chartData, setChartData] = useState<ActivityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date | null>(null);
  const [screenWidth, setScreenWidth] = useState(0); // State for screen width

  // Initialize screenWidth and add resize listener
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    if (typeof window !== 'undefined') {
      setScreenWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
    }
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize currentWeekStart only on the client side
  useEffect(() => {
    if (currentWeekStart === null && screenWidth > 0) { // Ensure screenWidth is set
      const initialDate = new Date();
      const { startOfWeek } = getWeekRange(initialDate);
      setCurrentWeekStart(startOfWeek);
    }
  }, [currentWeekStart, screenWidth]); // Depend on screenWidth too

  useEffect(() => {
    if (currentWeekStart === null || screenWidth === 0) return;

    const fetchData = async () => {
      setIsLoading(true);
      const { startOfWeek, endOfWeek } = getWeekRange(currentWeekStart);
      
      try {
        const response = await api.get('/dashboard', {
          params: {
            start_date: formatDate(startOfWeek),
            end_date: formatDate(endOfWeek),
          },
        });
        const weekDates = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date(startOfWeek);
          d.setDate(startOfWeek.getDate() + i);
          return formatDate(d);
        });

        const formattedData = weekDates.map(date => {
          const existingData = response.data.chart_data.find((item: ActivityData) => item.date === date);
          return {
            date: new Date(date).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' }),
            score: existingData?.score || null,
            sleep_hours: existingData?.sleep_hours || null,
            screen_time: existingData?.screen_time || null,
            mood: existingData?.mood || null,
          };
        });
        setChartData(formattedData);
      } catch (error) {
        console.error("週間サマリーの読み込みに失敗しました。", error);
        setChartData([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentWeekStart, screenWidth]); // Depend on screenWidth here too

  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => {
      if (prev === null) return null;
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() - 7);
      return newDate;
    });
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(prev => {
      if (prev === null) return null;
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + 7);
      return newDate;
    });
  };

  if (currentWeekStart === null || screenWidth === 0) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <p className="text-gray-300 text-center">カレンダーを読み込み中...</p>
      </div>
    );
  }

  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

  const isMobile = screenWidth < 768; // Tailwind's 'md' breakpoint

  const renderChart = (dataKey: keyof ActivityData, stroke: string, name: string, yAxisDomain?: [number, number]) => (
    <div className="mb-8">
      <h4 className="text-lg font-semibold text-gray-100 mb-2">{name}</h4>
      <div style={{ width: '100%', height: isMobile ? 200 : 300 }}>
        <ResponsiveContainer>
          <LineChart
            data={chartData}
            margin={{
              top: 5, right: isMobile ? 10 : 30, left: isMobile ? 5 : 20, bottom: isMobile ? 5 : 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9CA3AF"
              interval="preserveStartEnd"
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? "end" : "middle"}
              height={isMobile ? 60 : 30}
              tick={{ fontSize: isMobile ? 10 : 12 }}
            />
            <YAxis
              orientation="left"
              stroke={stroke}
              domain={yAxisDomain || ['auto', 'auto']}
              tick={{ fontSize: isMobile ? 10 : 12 }}
              width={isMobile ? 30 : 60} // Give more space for Y-axis labels
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
              labelStyle={{ color: '#F3F4F6' }}
            />
            <Line type="monotone" dataKey={dataKey} stroke={stroke} name={name} activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <button onClick={goToPreviousWeek} className="p-2 rounded-full hover:bg-gray-700 text-gray-300 cursor-pointer">
          <ChevronLeft size={24} />
        </button>
        <h3 className="text-xl font-bold text-gray-100 text-center flex-grow">
          {`${formatDate(currentWeekStart)} - ${formatDate(currentWeekEnd)}`}
        </h3>
        <button onClick={goToNextWeek} className="p-2 rounded-full hover:bg-gray-700 text-gray-300 cursor-pointer">
          <ChevronRight size={24} />
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-300 text-center">グラフを読み込み中...</p>
      ) : chartData.length > 0 ? (
        isMobile ? (
          <div className="space-y-4">
            {renderChart('score', '#818CF8', '生産性スコア', [0, 100])}
            {renderChart('sleep_hours', '#4ADE80', '睡眠時間', [0, 12])}
            {renderChart('screen_time', '#FF7F50', 'スマホ時間', [0, 180])} {/* Assuming max 3 hours screen time for scale */}
            {renderChart('mood', '#FFD700', '気分 (1-5)', [0, 5])}
          </div>
        ) : (
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <LineChart
                data={chartData}
                margin={{
                  top: 5, right: 30, left: 20, bottom: 20, // Increased left/right margins for Y-axis labels
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date" 
                  stroke="#9CA3AF" 
                  interval="preserveStartEnd" 
                  angle={0} 
                  textAnchor="middle"
                  height={30}
                />
                <YAxis yAxisId="left" orientation="left" stroke="#818CF8" domain={[0, 100]} width={60} /> {/* Score */}
                <YAxis yAxisId="right" orientation="right" stroke="#4ADE80" domain={[0, 12]} width={60} /> {/* Sleep */}
                <YAxis yAxisId="right2" orientation="right" stroke="#FF7F50" domain={[0, 180]} width={60} /> {/* Screen Time - need new yAxisId */}
                <YAxis yAxisId="left2" orientation="left" stroke="#FFD700" domain={[0, 5]} width={60} /> {/* Mood - need new yAxisId */}
                
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="score" stroke="#818CF8" name="生産性スコア" activeDot={{ r: 8 }} />
                <Line yAxisId="right" type="monotone" dataKey="sleep_hours" stroke="#4ADE80" name="睡眠時間" activeDot={{ r: 8 }} />
                <Line yAxisId="right2" type="monotone" dataKey="screen_time" stroke="#FF7F50" name="スマホ時間" activeDot={{ r: 8 }} />
                <Line yAxisId="left2" type="monotone" dataKey="mood" stroke="#FFD700" name="気分 (1-5)" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      ) : (
        <p className="text-gray-300 text-center">表示するデータがまだありません。</p>
      )}
    </div>
  );
}
