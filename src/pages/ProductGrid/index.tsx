import React, { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Dialog, Transition } from '@headlessui/react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Edit, Save, Delete, PlusCircle, RefreshCw, Truck } from 'lucide-react';
import clsx from "clsx";
import 'tailwindcss/tailwind.css';
import { initializeApp } from "firebase/app";
import { getFirestore, Timestamp } from "firebase/firestore";
import DatePicker from 'react-datepicker';
import { startOfDay, endOfDay, subDays } from 'date-fns';

const firebaseConfig = {
  apiKey: "AIzaSyCc0oSHlqlX7fLeqqonODsOIC3XA8NI7hc",
  authDomain: "onboarding-a5fcb.firebaseapp.com",
  databaseURL: "https://onboarding-a5fcb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "onboarding-a5fcb",
  storageBucket: "onboarding-a5fcb.appspot.com",
  messagingSenderId: "334607574757",
  appId: "1:334607574757:web:2603a69bf85f4a1e87960c",
  measurementId: "G-2C9J1RY67L"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface PieSelection {
  pie: string;
  size: string;
  quantity: number;
}

interface Order {
  id: string;
  date: string;
  name: string;
  pies: PieSelection[];
  type: string;
  remarks: string;
  status: string;
}

interface DeliveryForm {
  cost: string;
  createdOn: Timestamp | null;
  dateDelivery: string;
  deliveryPerson: string;
  dropOffAddress: string;
  orderId: string;
  pickupLocation: string;
  recipientName: string;
  timeDelivery: string;
}

const Orders = () => {
  const [ordersData, setOrdersData] = useState<Order[]>([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newOrder, setNewOrder] = useState<Order>({
    id: '',
    date: '',
    name: '',
    pies: [{ pie: '', size: '', quantity: 0 }],
    type: '',
    remarks: '',
    status: 'Pending'
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Order>>({
    pies: [{ pie: '', size: '', quantity: 0 }]
  });
  const [openDeliveryDialog, setOpenDeliveryDialog] = useState(false);
  const [dateRange, setDateRange] = useState([startOfDay(subDays(new Date(), 30)), endOfDay(new Date())]);
  const [deliveryFormData, setDeliveryFormData] = useState<DeliveryForm>({
    cost: '',
    createdOn: null,
    dateDelivery: '',
    deliveryPerson: '',
    dropOffAddress: '',
    orderId: '',
    pickupLocation: 'TTDI',
    recipientName: '',
    timeDelivery: '',
  });

  const fetchOrders = async () => {
    try {
      const ordersSnapshot = await getDocs(collection(db, "companies/010/orders"));
      const ordersList: Order[] = [];
      ordersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data && Array.isArray(data.pies)) {
          ordersList.push({ id: doc.id, ...data } as Order);
        }
      });
      const filteredOrders = ordersList.filter(order => {
        const orderDate = new Date(order.date);
        return orderDate >= dateRange[0] && orderDate <= dateRange[1];
      });
      filteredOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      console.log('Orders data:', filteredOrders);
      setOrdersData(filteredOrders);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [dateRange]);

  const handleOpenAddDialog = () => {
    setOpenAddDialog(true);
  };

  const handleCloseAddDialog = () => {
    setOpenAddDialog(false);
    setNewOrder({
      id: '',
      date: '',
      name: '',
      pies: [{ pie: '', size: '', quantity: 0 }],
      type: '',
      remarks: '',
      status: 'Pending'
    });
  };

  const handleOpenDeliveryDialog = (order: Order) => {
    setOpenDeliveryDialog(true);
    setDeliveryFormData(prevState => ({
      ...prevState,
      recipientName: order.name,
      orderId: order.id,
    }));
  };

  const fetchDeliveryCost = async (order: DeliveryForm): Promise<number> => {
    try {
      const response = await fetch('https://hook.us1.make.com/gcvur3ypeelh5yrg5dtc13ddc7ulhzji', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: order.dropOffAddress }),
      });
      const data = await response.json();
      return parseFloat(data);
    } catch (error) {
      console.error('Error fetching delivery cost:', error);
      return 0;
    }
  };

  const handleCloseDeliveryDialog = async () => {
    try {
      const tempcost = await fetchDeliveryCost(deliveryFormData);
      const cost = tempcost / 1000;
      await addDoc(collection(db, "companies/010/deliveries"), { ...deliveryFormData, cost, createdOn: Timestamp.now() });
      setOpenDeliveryDialog(false);
      setDeliveryFormData({
        cost: '',
        createdOn: null,
        dateDelivery: '',
        deliveryPerson: '',
        dropOffAddress: '',
        orderId: '',
        pickupLocation: '',
        recipientName: '',
        timeDelivery: '',
      });
      fetchOrders();
    } catch (error) {
      console.error('Error submitting delivery information:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewOrder(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handlePiesChange = (index: number, field: string, value: string | number) => {
    const updatedPies = [...newOrder.pies];
    updatedPies[index] = { ...updatedPies[index], [field]: value };
    setNewOrder(prevState => ({
      ...prevState,
      pies: updatedPies
    }));
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleEditPiesChange = (index: number, field: string, value: string | number) => {
    const updatedPies = [...(editFormData.pies || [])];
    updatedPies[index] = { ...updatedPies[index], [field]: value };
    setEditFormData(prevState => ({
      ...prevState,
      pies: updatedPies
    }));
  };

  const handleDeliveryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDeliveryFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const addPie = () => {
    setNewOrder(prevState => ({
      ...prevState,
      pies: [...prevState.pies, { pie: '', size: '', quantity: 0 }]
    }));
  };

  const addEditPie = () => {
    setEditFormData(prevState => ({
      ...prevState,
      pies: [...(prevState.pies || []), { pie: '', size: '', quantity: 0 }]
    }));
  };

  const removePie = (index: number) => {
    const updatedPies = newOrder.pies.filter((_, i) => i !== index);
    setNewOrder(prevState => ({
      ...prevState,
      pies: updatedPies
    }));
  };

  const removeEditPie = (index: number) => {
    const updatedPies = (editFormData.pies || []).filter((_, i) => i !== index);
    setEditFormData(prevState => ({
      ...prevState,
      pies: updatedPies
    }));
  };

  const submitNewOrder = async (isDraft: boolean) => {
    try {
      const orderData = { ...newOrder, status: isDraft ? 'Draft' : 'Pending' };
      const docRef = await addDoc(collection(db, "companies/010/orders"), orderData);
      await updateDoc(doc(db, `companies/010/orders/${docRef.id}`), { id: docRef.id });
      fetchOrders();
      handleCloseAddDialog();
    } catch (error) {
      console.error('Error submitting new order:', error);
    }
  };

  const startEdit = (order: Order) => {
    setEditingId(order.id);
    setEditFormData(order);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const saveEdit = async () => {
    try {
      const orderRef = doc(db, `companies/010/orders/${editingId}`);
      await updateDoc(orderRef, editFormData);
      setEditingId(null);
      fetchOrders();
    } catch (error) {
      console.error('Error saving order edits:', error);
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      const orderRef = doc(db, `companies/010/orders/${id}`);
      await deleteDoc(orderRef);
      fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  const renderOrdersTable = () => (
    <div className="max-w-full overflow-x-auto shadow-md sm:rounded-lg">
      <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <th scope="col" className="px-6 py-3">Order ID</th>
            <th scope="col" className="px-6 py-3">Date</th>
            <th scope="col" className="px-6 py-3">Name</th>
            <th scope="col" className="px-6 py-3">Pies</th>
            <th scope="col" className="px-6 py-3">Type</th>
            <th scope="col" className="px-6 py-3">Remarks</th>
            <th scope="col" className="px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {ordersData.map((order, index) => (
            <tr
              key={order.id}
              className={clsx(index % 2 === 0 ? 'bg-white' : 'bg-gray-50', 'border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600')}
            >
              <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{order.id}</td>
              <td className="px-6 py-4">{editingId === order.id ? <input type="date" name="date" value={editFormData.date || ''} onChange={handleEditChange} className="w-full border p-1 rounded-md" /> : order.date}</td>
              <td className="px-6 py-4">{editingId === order.id ? <input type="text" name="name" value={editFormData.name || ''} onChange={handleEditChange} className="w-full border p-1 rounded-md" /> : order.name}</td>
              <td className="px-6 py-4">
                {editingId === order.id ? (
                  <>
                    {(editFormData.pies || []).map((pie, pieIndex) => (
                      <div key={pieIndex} className="flex space-x-2 mt-2">
                        <select
                          name={`edit-pie-${pieIndex}`}
                          onChange={(e) => handleEditPiesChange(pieIndex, 'pie', e.target.value)}
                          className="w-1/2 border p-2 rounded"
                          value={pie.pie}
                        >
                          <option value="">Select Pie</option>
                          <option value="Classic Apple Pie">Classic Apple Pie</option>
                          <option value="Johnny Blueberry">Johnny Blueberry</option>
                          <option value="Lady Pineapple">Lady Pineapple</option>
                          <option value="Caramel 'O' Pecan">Caramel 'O' Pecan</option>
                        </select>
                        <select
                          name={`edit-size-${pieIndex}`}
                          onChange={(e) => handleEditPiesChange(pieIndex, 'size', e.target.value)}
                          className="w-1/4 border p-2 rounded"
                          value={pie.size}
                        >
                          <option value="">Select Size</option>
                          <option value="Regular 5+” (4-5 servings)">Regular 5+” (4-5 servings)</option>
                          <option value="Medium 7+” (7-9 servings)">Medium 7+” (7-9 servings)</option>
                          <option value="Large 9+” (12-14 servings)">Large 9+” (12-14 servings)</option>
                        </select>
                        <input
                          type="number"
                          name={`edit-quantity-${pieIndex}`}
                          onChange={(e) => handleEditPiesChange(pieIndex, 'quantity', parseInt(e.target.value))}
                          placeholder="Quantity"
                          className="w-1/6 border p-2 rounded"
                          value={pie.quantity}
                        />
                        <button onClick={() => removeEditPie(pieIndex)} className="p-2 text-red-600">
                          <Delete />
                        </button>
                      </div>
                    ))}
                    <button onClick={addEditPie} className="mt-2 p-2 bg-blue-500 text-white rounded">
                      Add Another Pie
                    </button>
                  </>
                ) : (
                  <div>
                    {order.pies.map((pie, pieIndex) => (
                      <div key={pieIndex}>
                        <span>{pie.pie} - {pie.size} - {pie.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                {editingId === order.id ? (
                  <select
                    name="type"
                    value={editFormData.type || ''}
                    onChange={handleEditChange}
                    className="w-full border p-1 rounded-md"
                  >
                    <option value="Delivery">Delivery</option>
                    <option value="Pick Up">Pick Up</option>
                  </select>
                ) : (
                  order.type
                )}
              </td>
              <td className="px-6 py-4">{editingId === order.id ? <input type="text" name="remarks" value={editFormData.remarks || ''} onChange={handleEditChange} className="w-full border p-1 rounded-md" /> : order.remarks}</td>
              <td className="px-6 py-4 flex space-x-2">
                {editingId === order.id ? (
                  <>
                    <button onClick={saveEdit} className="p-2 text-green-600">
                      <Save />
                    </button>
                    <button onClick={cancelEdit} className="p-2 text-red-600">
                      <Delete />
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(order)} className="p-2 text-blue-600">
                      <Edit />
                    </button>
                    <button onClick={() => deleteOrder(order.id)} className="p-2 text-red-600">
                      <Delete />
                    </button>
                    <button onClick={() => handleOpenDeliveryDialog(order)} className="p-2 text-blue-600">
                      <Truck />
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <ToastContainer />
      <div className="flex flex-wrap items-center col-span-12 mt-2 intro-y sm:flex-nowrap pt-4 pb-4 pl-6 pr-6">
        <div className="text-lg font-semibold">Orders</div>
        <div className="flex space-x-2 ml-auto">
          <button onClick={handleOpenAddDialog} className="p-2 m-2 !box">
            <PlusCircle />
          </button>
        </div>
      </div>

      <Transition show={openAddDialog} as={React.Fragment}>
        <Dialog onClose={handleCloseAddDialog} className="fixed inset-0 z-10 overflow-y-auto">
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
            </Transition.Child>
            <span className="inline-block h-screen align-middle" aria-hidden="true">
              &#8203;
            </span>
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  Add New Order
                </Dialog.Title>
                <div className="mt-2">
                  <div className="flex space-x-2">
                    <input
                      id="date"
                      type="date"
                      name="date"
                      onChange={handleChange}
                      value={newOrder.date}
                      className="w-1/3 border p-2 rounded"
                    />
                    <input
                      type="text"
                      name="name"
                      placeholder="Name"
                      onChange={handleChange}
                      className="w-1/3 border p-2 rounded"
                    />
                    <select
                      name="type"
                      onChange={handleChange}
                      className="w-1/3 border p-2 rounded"
                    >
                      <option value="Delivery">Delivery</option>
                      <option value="Pick Up">Pick Up</option>
                    </select>
                  </div>
                  <div className="mt-2">
                    <input
                      type="text"
                      name="remarks"
                      placeholder="Remarks"
                      onChange={handleChange}
                      className="w-full border p-2 rounded"
                    />
                  </div>
                  <div className="mt-2">
                    {newOrder.pies.map((pie, index) => (
                      <div key={index} className="flex space-x-2 mt-2">
                        <select
                          name={`pie-${index}`}
                          onChange={(e) => handlePiesChange(index, 'pie', e.target.value)}
                          className="w-1/2 border p-2 rounded"
                          value={pie.pie}
                        >
                          <option value="">Select Pie</option>
                          <option value="Classic Apple Pie">Classic Apple Pie</option>
                          <option value="Johnny Blueberry">Johnny Blueberry</option>
                          <option value="Lady Pineapple">Lady Pineapple</option>
                          <option value="Caramel 'O' Pecan">Caramel 'O' Pecan</option>
                        </select>
                        <select
                          name={`size-${index}`}
                          onChange={(e) => handlePiesChange(index, 'size', e.target.value)}
                          className="w-1/4 border p-2 rounded"
                          value={pie.size}
                        >
                          <option value="">Select Size</option>
                          <option value="Regular 5+” (4-5 servings)">Regular 5+” (4-5 servings)</option>
                          <option value="Medium 7+” (7-9 servings)">Medium 7+” (7-9 servings)</option>
                          <option value="Large 9+” (12-14 servings)">Large 9+” (12-14 servings)</option>
                        </select>
                        <input
                          type="number"
                          name={`quantity-${index}`}
                          onChange={(e) => handlePiesChange(index, 'quantity', parseInt(e.target.value))}
                          placeholder="Quantity"
                          className="w-1/6 border p-2 rounded"
                          value={pie.quantity}
                        />
                        <button onClick={() => removePie(index)} className="p-2 text-red-600">
                          <Delete />
                        </button>
                      </div>
                    ))}
                    <button onClick={addPie} className="mt-2 p-2 bg-blue-500 text-white rounded">
                      Add Another Pie
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleCloseAddDialog}
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => submitNewOrder(true)}
                    className="inline-flex justify-center px-4 py-2 ml-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => submitNewOrder(false)}
                    className="inline-flex justify-center px-4 py-2 ml-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      <Transition show={openDeliveryDialog} as={React.Fragment}>
        <Dialog onClose={() => setOpenDeliveryDialog(false)} className="fixed inset-0 z-10 overflow-y-auto">
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
            </Transition.Child>
            <span className="inline-block h-screen align-middle" aria-hidden="true">
              &#8203;
            </span>
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  Add to Delivery
                </Dialog.Title>
                <div className="mt-2">
                  <input
                    type="text"
                    name="recipientName"
                    placeholder="Recipient Name"
                    onChange={handleDeliveryChange}
                    value={deliveryFormData.recipientName}
                    className="w-full mt-2 border p-2 rounded"
                  />
                  <input
                    type="text"
                    name="dropOffAddress"
                    placeholder="Drop Off Address"
                    onChange={handleDeliveryChange}
                    value={deliveryFormData.dropOffAddress}
                    className="w-full mt-2 border p-2 rounded"
                  />
                  <input
                    type="time"
                    name="timeDelivery"
                    placeholder="Time Delivery"
                    onChange={handleDeliveryChange}
                    value={deliveryFormData.timeDelivery}
                    className="w-full mt-2 border p-2 rounded"
                  />
                  <input
                    type="date"
                    name="dateDelivery"
                    placeholder="Date Delivery"
                    onChange={handleDeliveryChange}
                    value={deliveryFormData.dateDelivery}
                    className="w-full mt-2 border p-2 rounded"
                  />
                  <input
                    type="text"
                    name="deliveryPerson"
                    placeholder="Delivery Person"
                    onChange={handleDeliveryChange}
                    value={deliveryFormData.deliveryPerson}
                    className="w-full mt-2 border p-2 rounded"
                  />
                  <input
                    type="text"
                    name="pickupLocation"
                    placeholder="Pickup Location"
                    onChange={handleDeliveryChange}
                    value={deliveryFormData.pickupLocation}
                    className="w-full mt-2 border p-2 rounded"
                  />
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setOpenDeliveryDialog(false)}
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseDeliveryDialog}
                    className="inline-flex justify-center px-4 py-2 ml-2 text-sm font-medium text-blue-900 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
      <div className="flex space-x-4 justify-center items-center mb-4">
        <DatePicker
          selected={dateRange[0]}
          onChange={(date: Date) => setDateRange([date, dateRange[0]])}
          selectsStart
          startDate={dateRange[0]}
          endDate={dateRange[1]}
          className="bg-white rounded"
        />
        <DatePicker
          selected={dateRange[1]}
          onChange={(date: Date) => setDateRange([dateRange[0], date])}
          selectsEnd
          startDate={dateRange[0]}
          endDate={dateRange[1]}
          className="bg-white rounded"
        />
      </div>
      <div className="p-4">
        {renderOrdersTable()}
      </div>
    </>
  );
};

export default Orders;
