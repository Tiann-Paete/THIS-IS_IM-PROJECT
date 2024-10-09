import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { HiCurrencyDollar, HiShoppingCart, HiUsers, HiStar, HiCalendar, HiChevronDown } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';

const POSDashboard = () => {
  const [salesData, setSalesData] = useState({
    periodSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
  });
  const [ratedProductsCount, setRatedProductsCount] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [topProducts, setTopProducts] = useState([]);
  const [timeFrame, setTimeFrame] = useState('today');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [timeFrame]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchSalesData(),
        fetchRatedProductsCount(),
        fetchTopProducts(),
        fetchTotalProducts()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSalesData = async () => {
    const response = await axios.get(`/api/sales-data?timeFrame=${timeFrame}`);
    setSalesData(response.data);
  };

  const fetchRatedProductsCount = async () => {
    const response = await axios.get(`/api/rated-products-count?timeFrame=${timeFrame}`);
    setRatedProductsCount(response.data.ratedProductsCount);
  };

  const fetchTopProducts = async () => {
    const response = await axios.get('/api/top-products');
    setTopProducts(response.data);
  };

  const fetchTotalProducts = async () => {
    const response = await axios.get('/api/total-products');
    setTotalProducts(response.data.totalProducts);
  };

  const formatCurrency = (value) => {
    return typeof value === 'number' ? `₱${value.toFixed(2)}` : '₱0.00';
  };

  const timeFrameOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'lastWeek', label: 'Last Week' },
    { value: 'lastMonth', label: 'Last Month' },
  ];

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 p-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl pr-4 font-bold text-gray-800">Point of Sale Dashboard</h2>
        
        {/* Time Frame Dropdown */}
        <div className="relative inline-block text-left">
          <div>
            <button
              type="button"
              className="inline-flex justify-center pb-3 w-full rounded-md border border-neutral-600 shadow-sm px-4 py-2 bg-neutral-800 text-sm font-medium text-white hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500 transition-colors duration-200"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <HiCalendar className="mr-2 h-5 w-5 text-neutral-300" aria-hidden="true" />
              {timeFrameOptions.find(option => option.value === timeFrame)?.label}
              <HiChevronDown className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-neutral-800 ring-1 ring-black ring-opacity-5 divide-y divide-neutral-700 focus:outline-none"
              >
                <div className="py-1">
                  {timeFrameOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`${
                        timeFrame === option.value ? 'bg-neutral-700 text-white' : 'text-white'
                      } group flex items-center w-full px-4 py-2 text-sm hover:bg-neutral-600 hover:text-white transition-colors duration-150`}
                      onClick={() => {
                        setTimeFrame(option.value);
                        setIsDropdownOpen(false);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="loader"></div>
        </div>
      ) : (
        <>
          {/* Sales statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatePresence mode="wait">
              <StatCard
                key={`${timeFrame}-rated-products`}
                icon={<HiStar className="w-8 h-8 text-yellow-400" />}
                title={`Rated Products (${timeFrame})`}
                value={ratedProductsCount}
                animate={true}
              />
            </AnimatePresence>
            <AnimatePresence mode="wait">
              <StatCard
                key={`${timeFrame}-sales`}
                icon={<HiCurrencyDollar className="w-8 h-8 text-green-500" />}
                title={`Total ${timeFrame.charAt(0).toUpperCase() + timeFrame.slice(1)} Sales`}
                value={formatCurrency(salesData.periodSales)}
                animate={true}
              />
            </AnimatePresence>
            <AnimatePresence mode="wait">
              <StatCard
                key={`${timeFrame}-orders`}
                icon={<HiShoppingCart className="w-8 h-8 text-orange-500" />}
                title="Total Orders"
                value={salesData.totalOrders || 0}
                animate={true}
              />
            </AnimatePresence>
            <AnimatePresence mode="wait">
              <StatCard
                key={`${timeFrame}-customers`}
                icon={<HiUsers className="w-8 h-8 text-neutral-600" />}
                title={`Total Customers (${timeFrame})`}
                value={salesData.totalCustomers || 0}
                animate={true}
              />
            </AnimatePresence>
          </div>

          {/* Top products */}
      <motion.div 
        className="bg-white p-6 rounded-lg shadow-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <h3 className="text-xl font-semibold mb-4 text-gray-800">
          Top Products <span className="text-gray-400 text-sm">({totalProducts} total)</span>
        </h3>
        <div className="">
          {topProducts.map((product, index) => (
            <motion.div 
              key={product.id} 
              className="flex items-center justify-between p-4 rounded-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.3 }}
            >
              <div className="flex items-center">
                <img src={product.image_url} alt={product.name} className="w-16 h-16 object-cover rounded-md mr-4" />
                <div>
                  <p className="font-medium text-gray-800">{product.name}</p>
                  <p className="text-sm text-gray-500">
                    Sold: {product.sold || 0}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <HiStar className="w-5 h-5 text-yellow-400 mr-1" />
                <span className="font-medium text-black">
                  {product.avg_rating}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
        </>
      )}
      <style jsx>{`
        .loader {
          border: 5px solid #f3f3f3;
          border-top: 5px solid #ff9800; /* Orange color */
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
};

const StatCard = ({ icon, title, value, animate }) => (
  <motion.div
    className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4"
    initial={animate ? { opacity: 0, y: 20 } : false}
    animate={animate ? { opacity: 1, y: 0 } : false}
    exit={animate ? { opacity: 0, y: -20 } : false}
    transition={{ duration: 0.3 }}
    whileHover={{ scale: 1.03 }}
  >
    <div>{icon}</div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </motion.div>
);

export default POSDashboard;