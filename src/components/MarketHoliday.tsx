import { useState, useEffect } from 'react';
import { isHoliday, getHolidays } from 'nyse-holidays';

interface MarketHolidayTestProps {
  // No props needed for testing
}

export function MarketHoliday({}: MarketHolidayTestProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isHolidayToday, setIsHolidayToday] = useState<boolean | null>(null);
    const [holidaysThisYear, setHolidaysThisYear] = useState<any[]>([]);
    const [nextHoliday, setNextHoliday] = useState<any | null>(null);
    const [showAllHolidays, setShowAllHolidays] = useState(false);

    useEffect(() => {
        // Update current date every minute
        const interval = setInterval(() => {
            setCurrentDate(new Date());
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Test holiday functionality
        try {
            // Check if today is a holiday
            const todayHoliday = isHoliday(currentDate);
            setIsHolidayToday(todayHoliday);

            // Get all holidays for current year
            const year = currentDate.getFullYear();
            const holidays = getHolidays(year);
            setHolidaysThisYear(holidays);

            // Find next holiday
            const nextHoliday = holidays.find(holiday => {
                const holidayDate = new Date(holiday.date);
                return holidayDate > currentDate;
            });
            setNextHoliday(nextHoliday);

            } catch (error) {
                console.error('Error testing nyse-holidays:', error);
            }
    }, [currentDate]);

        const formatDate = (date: Date) => {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
        };

    const getDaysUntilHoliday = (holidayDate: Date) => {
        const today = new Date();
        const timeDiff = holidayDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return daysDiff;
    };

    const getUpcomingHolidays = () => {
        return holidaysThisYear
        .filter(holiday => new Date(holiday.date) > currentDate)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };

    const upcomingHolidays = getUpcomingHolidays();

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mt-4">
            {/* Header */}
            <div className="flex items-center space-x-2 mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">NYSE Market Calendar</h3>
            </div>

        {/* Next Holiday */}
        {nextHoliday && (
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Next Holiday: {formatDate(new Date(nextHoliday.date))} ({nextHoliday.name})</p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Days until holiday: {getDaysUntilHoliday(new Date(nextHoliday.date))}</p>
            </div>
        )}

      {/* Toggle for All Holidays */}
        {upcomingHolidays.length > 1 && (
            <div className="mt-4">
            <button onClick={() => setShowAllHolidays(!showAllHolidays)}
                    className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
                <span>{showAllHolidays ? 'Hide' : 'Show'} all future holidays</span>
                <svg  className={`w-4 h-4 transition-transform ${showAllHolidays ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* All Future Holidays */}
            {showAllHolidays && (
                <div className="mt-3 space-y-2">
                {upcomingHolidays.slice(1).map((holiday, index) => (
                    <div key={index} className="flex justify-between items-center text-sm text-gray-600">
                        <span>{holiday.name}</span>
                        <span>{formatDate(new Date(holiday.date))} ({getDaysUntilHoliday(new Date(holiday.date))} days)</span>
                    </div>
                ))}
                </div>
            )}
            </div>
        )}
    </div>
  );
} 