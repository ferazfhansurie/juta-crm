import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import _ from "lodash";
import clsx from "clsx";
import { FormInput } from "@/components/Base/Form";
import Lucide from "@/components/Base/Lucide";
import TinySlider, { TinySliderElement } from "@/components/Base/TinySlider";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
interface Order {
  id: string;
  date: string;
  pie: string;
  size: string;
  quantity: number;
}

interface Material {
  id: string;
  name: string;
  apple?: MaterialSize;
  cinnamon?: MaterialSize;
  pineapple?: MaterialSize;
  blueberry?: MaterialSize;
  pecan?: MaterialSize;
  caramel?: MaterialSize;
  spice?: MaterialSize;
  sauce?: number;
}

interface MaterialSize {
  regular: number;
  large: number;
}

interface MaterialsNeeded {
  [pie: string]: {
    [ingredient: string]: number;
  };
}

function Main() {
  const importantNotesRef = useRef<TinySliderElement>(null);
  const prevImportantNotes = () => {
    importantNotesRef.current?.tns.goTo("prev");
  };
  const nextImportantNotes = () => {
    importantNotesRef.current?.tns.goTo("next");
  };

  const [ordersData, setOrdersData] = useState<Order[]>([]);
  const [materialsData, setMaterialsData] = useState<Material[]>([]);
  const [materialsNeeded, setMaterialsNeeded] = useState<MaterialsNeeded>({});
  const [dateRange, setDateRange] = useState([startOfDay(subDays(new Date(), 30)), endOfDay(new Date())]);

  const fetchData = async () => {
    try {
      const ordersSnapshot = await getDocs(collection(db, "companies/010/orders"));
      const materialsSnapshot = await getDocs(collection(db, "companies/010/materials"));

      const ordersList: Order[] = [];
      ordersSnapshot.forEach((doc) => {
        ordersList.push({ id: doc.id, ...doc.data() } as Order);
      });

      const materialsList: Material[] = [];
      materialsSnapshot.forEach((doc) => {
        materialsList.push({ id: doc.id, ...doc.data() } as Material);
      });

      console.log('Orders data:', ordersList);
      console.log('Materials data:', materialsList);

      setOrdersData(ordersList);
      setMaterialsData(materialsList);

    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, [dateRange]);

  useEffect(() => {
    const calculateMaterialsNeeded = () => {
      if (ordersData.length === 0 || materialsData.length === 0) {
        return;
      }

      const updatedMaterialsNeeded: MaterialsNeeded = {};

      ordersData.forEach(order => {
        const { pie, size, quantity } = order;

        materialsData.forEach(material => {
          if (material.name === pie) {
            switch (pie) {
              case "Classic Apple Pie":
                handleMaterial(material, size, quantity, "apple", updatedMaterialsNeeded);
                handleMaterial(material, size, quantity, "cinnamon", updatedMaterialsNeeded);
                handleSauce(material, quantity, updatedMaterialsNeeded);
                break;
              case "Lady Pineapple":
                handleMaterial(material, size, quantity, "pineapple", updatedMaterialsNeeded);
                handleMaterial(material, size, quantity, "sauce", updatedMaterialsNeeded);
                break;
              case "Johnny Blueberry":
                handleMaterial(material, size, quantity, "blueberry", updatedMaterialsNeeded);
                handleMaterial(material, size, quantity, "co", updatedMaterialsNeeded);
                handleMaterial(material, size, quantity, "sauce", updatedMaterialsNeeded);
                break;
              case "Caramel 'O' Pecan":
                handleMaterial(material, size, quantity, "pecan", updatedMaterialsNeeded);
                handleMaterial(material, size, quantity, "caramel", updatedMaterialsNeeded);
                handleMaterial(material, size, quantity, "spice", updatedMaterialsNeeded);
                break;
              default:
                console.error(`Unhandled pie type: ${pie}`);
            }
          }
        });
      });

      setMaterialsNeeded(updatedMaterialsNeeded);
    };

    const handleMaterial = (material: Material, size: string, quantity: number, ingredient: string, updatedMaterialsNeeded: MaterialsNeeded) => {
      const { name } = material;
      const materialIngredient = material[ingredient as keyof Material];

      if (materialIngredient && typeof materialIngredient === 'object') {
        let quantityForIngredient;
        switch (size) {
          case "Regular 5+” (4-5 servings)":
            quantityForIngredient = materialIngredient.regular * quantity;
            break;
          case "Medium 7+” (7-9 servings)":
          case "Large 9+” (12-14 servings)":
            quantityForIngredient = materialIngredient.large * quantity;
            break;
          default:
            console.error(`Unhandled size for ${name}: ${size}`);
            return;
        }

        if (!updatedMaterialsNeeded[name]) {
          updatedMaterialsNeeded[name] = {};
        }
        updatedMaterialsNeeded[name][ingredient] = quantityForIngredient;
      }
    };

    const handleSauce = (material: Material, quantity: number, updatedMaterialsNeeded: MaterialsNeeded) => {
      const { name } = material;
      const sauceIngredient = material.sauce;

      if (sauceIngredient) {
        const quantityForSauce = sauceIngredient * quantity;
        if (!updatedMaterialsNeeded[name]) {
          updatedMaterialsNeeded[name] = {};
        }
        updatedMaterialsNeeded[name]['sauce'] = quantityForSauce;
      }
    };

    calculateMaterialsNeeded();
  }, [ordersData, materialsData]);

  const renderPieQuantitiesTable = () => {
    const pieQuantities: { [key: string]: { [key: string]: number } } = {};

    ordersData.forEach(order => {
      const { pie, size, quantity } = order;

      if (!pieQuantities[pie]) {
        pieQuantities[pie] = {};
      }

      if (!pieQuantities[pie][size]) {
        pieQuantities[pie][size] = 0;
      }

      pieQuantities[pie][size] += quantity;
    });

    return (
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="w-1/3 px-4 py-2">Pie</th>
              <th className="w-1/3 px-4 py-2">Size</th>
              <th className="w-1/3 px-4 py-2">Quantity</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(pieQuantities).map(pie => (
              Object.keys(pieQuantities[pie]).map((size, index) => (
                <tr key={`${pie}-${size}`} className={`${index % 2 === 0 ? "bg-gray-100" : "bg-white"}`}>
                  {index === 0 && (
                    <td rowSpan={Object.keys(pieQuantities[pie]).length} className="border px-4 py-2">{pie}</td>
                  )}
                  <td className="border px-4 py-2">{size}</td>
                  <td className="border px-4 py-2">{pieQuantities[pie][size]}</td>
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMaterialsTable = () => {
    return (
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="w-1/3 px-4 py-2">Pie</th>
              <th className="w-1/3 px-4 py-2">Material</th>
              <th className="w-1/3 px-4 py-2">Quantity</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(materialsNeeded).map(pie => (
              Object.keys(materialsNeeded[pie]).map((material, index) => (
                <tr key={`${pie}-${material}`} className={`${index % 2 === 0 ? "bg-gray-100" : "bg-white"}`}>
                  {index === 0 && (
                    <td rowSpan={Object.keys(materialsNeeded[pie]).length} className="border px-4 py-2">{pie}</td>
                  )}
                  <td className="border px-4 py-2">{material}</td>
                  <td className="border px-4 py-2">{materialsNeeded[pie][material]}</td>
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 2xl:col-span-9">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 mt-8">
          <div className="flex items-center h-10 intro-y pt-4 pb-4 pl-6 pr-6">
  <h2 className="mr-5 text-lg font-medium truncate">Production</h2>
</div>
            <div className="mt-5">
              <div className="flex space-x-4 justify-center items-center mb-4">
                <DatePicker
                  selected={dateRange[0]}
                  onChange={(date: Date) => setDateRange([date, dateRange[1]])}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-lg font-semibold">Orders</div>
                    <div className="flex space-x-2">
                      <button onClick={prevImportantNotes} className="p-2">
                        <Lucide icon="ChevronLeft" />
                      </button>
                      <button onClick={nextImportantNotes} className="p-2">
                        <Lucide icon="ChevronRight" />
                      </button>
                    </div>
                  </div>
                  {renderPieQuantitiesTable()}
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="text-lg font-semibold mb-4">Materials</div>
                  {renderMaterialsTable()}
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-12 mt-8">
            <div className="flex items-center h-10 intro-y">
              <h2 className="mr-5 text-lg font-medium truncate">Recent Messages</h2>
            </div>
          
          </div>
        </div>
      </div>
    </div>
  );
}

export default Main;
