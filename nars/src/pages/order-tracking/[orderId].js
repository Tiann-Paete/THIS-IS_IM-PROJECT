import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import axios from 'axios';

const OrderTracking = () => {
  const router = useRouter();
  const { orderId } = router.query;
  const [orderDetails, setOrderDetails] = useState(null);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await axios.get(`/api/order/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      setOrderDetails(response.data);
    } catch (error) {
      console.error('Error fetching order details:', error);
    }
  };

  if (!orderDetails) {
    return <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-orange-500"></div>
    </div>;
  }

  const statusSteps = ['Order Placed', 'Processing', 'Shipped', 'Delivered'];
  const currentStatusIndex = statusSteps.indexOf(orderDetails.status);

  return (
    <div className="container mx-auto p-4 sm:p-8 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Order Tracking</h1>
      
      {/* Status Progress Bar */}
      <div className="mb-12">
        <div className="flex justify-between mb-2">
          {statusSteps.map((step, index) => (
            <div key={index} className="text-center">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 mx-auto rounded-full ${index <= currentStatusIndex ? 'bg-orange-500' : 'bg-gray-300'} flex items-center justify-center text-white font-bold text-xs sm:text-sm`}>
                {index + 1}
              </div>
              <div className={`mt-2 text-xs sm:text-sm ${index <= currentStatusIndex ? 'text-orange-500 font-semibold' : 'text-gray-500'}`}>{step}</div>
            </div>
          ))}
        </div>
        <div className="relative pt-1">
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-300">
            <div style={{ width: `${(currentStatusIndex + 1) * 25}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-orange-500 transition-all duration-500"></div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden max-w-4xl mx-auto">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Order Details</h2>
              <div className="space-y-2">
                <p className="text-gray-600"><span className="font-semibold">Order ID:</span> {orderDetails.orderId}</p>
                <p className="text-gray-600"><span className="font-semibold">Tracking Number:</span> {orderDetails.trackingNumber}</p>
                <p className="text-gray-600"><span className="font-semibold">Status:</span> <span className="text-orange-500 font-semibold">{orderDetails.status}</span></p>
              </div>

              <h3 className="text-xl font-bold mt-6 mb-3 text-gray-800">Payment Method</h3>
              <p className="text-gray-600">{orderDetails.paymentMethod}</p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">Billing Information</h3>
              <div className="space-y-2">
                <p className="text-gray-600"><span className="font-semibold">Full Name:</span> {orderDetails.billingInfo.fullName}</p>
                <p className="text-gray-600"><span className="font-semibold">Phone Number:</span> {orderDetails.billingInfo.phoneNumber}</p>
                <p className="text-gray-600"><span className="font-semibold">Address:</span> {orderDetails.billingInfo.address}</p>
                <p className="text-gray-600"><span className="font-semibold">City:</span> {orderDetails.billingInfo.city}</p>
                <p className="text-gray-600"><span className="font-semibold">State/Province:</span> {orderDetails.billingInfo.stateProvince}</p>
                <p className="text-gray-600"><span className="font-semibold">Postal Code:</span> {orderDetails.billingInfo.postalCode}</p>
                <p className="text-gray-600"><span className="font-semibold">Delivery Address:</span> {orderDetails.billingInfo.deliveryAddress}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Ordered Items</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              {orderDetails.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                  <span className="font-semibold text-gray-700">{item.name}</span>
                  <span className="text-gray-600">
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs mr-2">x{item.quantity}</span>
                    ₱{item.price}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Order Summary</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">₱{orderDetails.subtotal}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Delivery Fee:</span>
                <span className="font-semibold">₱{orderDetails.delivery}</span>
              </div>
              <div className="flex justify-between text-lg font-bold mt-4 pt-2 border-t border-gray-200">
                <span>Total:</span>
                <span className="text-orange-500">₱{orderDetails.total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <button
          onClick={() => router.push('/home')}
          className="bg-orange-500 text-white px-6 py-3 rounded-full hover:bg-orange-600 transition duration-300 ease-in-out transform hover:scale-105"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default OrderTracking;