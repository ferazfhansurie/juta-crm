import _ from "lodash";
import fakerData from "@/utils/faker";
import Button from "@/components/Base/Button";
import { FormSwitch } from "@/components/Base/Form";
import Progress from "@/components/Base/Progress";
import Lucide from "@/components/Base/Lucide";
import StackedBarChart1 from "@/components/StackedBarChart1";
import SimpleLineChart from "@/components/SimpleLineChart";
import SimpleLineChart1 from "@/components/SimpleLineChart1";
import SimpleLineChart2 from "@/components/SimpleLineChart2";
import { Menu, Tab } from "@/components/Base/Headless";
import { Tab as HeadlessTab } from "@headlessui/react";

function Main() {
  return (
    <>
      <div className="flex items-center mt-8 intro-y">
        <h2 className="mr-auto text-lg font-medium">Profile Layout</h2>
      </div>
      <Tab.Group>
        {/* BEGIN: Profile Info */}
        <div className="px-5 pt-5 mt-5 intro-y box">
          <div className="flex flex-col pb-5 -mx-5 border-b lg:flex-row border-slate-200/60 dark:border-darkmode-400">
            <div className="flex items-center justify-center flex-1 px-5 lg:justify-start">
              <div className="relative flex-none w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 image-fit">
                <img
                  alt="Midone Tailwind HTML Admin Template"
                  className="rounded-full"
                  src={fakerData[0].photos[0]}
                />
                <div className="absolute bottom-0 right-0 flex items-center justify-center p-2 mb-1 mr-1 rounded-full bg-primary">
                  <Lucide icon="Camera" className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="ml-5">
                <div className="w-24 text-lg font-medium truncate sm:w-40 sm:whitespace-normal">
                  {fakerData[0].users[0].name}
                </div>
                <div className="text-slate-500">{fakerData[0].jobs[0]}</div>
              </div>
            </div>
            <div className="flex-1 px-5 pt-5 mt-6 border-t border-l border-r lg:mt-0 border-slate-200/60 dark:border-darkmode-400 lg:border-t-0 lg:pt-0">
              <div className="font-medium text-center lg:text-left lg:mt-3">
                Contact Details
              </div>
              <div className="flex flex-col items-center justify-center mt-4 lg:items-start">
                <div className="flex items-center truncate sm:whitespace-normal">
                  <Lucide icon="Mail" className="w-4 h-4 mr-2" />
                  {fakerData[0].users[0].email}
                </div>
                <div className="flex items-center mt-3 truncate sm:whitespace-normal">
                  <Lucide icon="Instagram" className="w-4 h-4 mr-2" /> Instagram
                  {fakerData[0].users[0].name}
                </div>
                <div className="flex items-center mt-3 truncate sm:whitespace-normal">
                  <Lucide icon="Twitter" className="w-4 h-4 mr-2" /> Twitter
                  {fakerData[0].users[0].name}
                </div>
              </div>
            </div>
            <div className="flex-1 px-5 pt-5 mt-6 border-t lg:mt-0 lg:border-0 border-slate-200/60 dark:border-darkmode-400 lg:pt-0">
              <div className="font-medium text-center lg:text-left lg:mt-5">
                Sales Growth
              </div>
              <div className="flex items-center justify-center mt-2 lg:justify-start">
                <div className="flex w-20 mr-2">
                  USP:{" "}
                  <span className="ml-3 font-medium text-success">+23%</span>
                </div>
                <div className="w-3/4">
                  <SimpleLineChart1 height={55} className="-mr-5" />
                </div>
              </div>
              <div className="flex items-center justify-center lg:justify-start">
                <div className="flex w-20 mr-2">
                  STP: <span className="ml-3 font-medium text-danger">-2%</span>
                </div>
                <div className="w-3/4">
                  <SimpleLineChart2 height={55} className="-mr-5" />
                </div>
              </div>
            </div>
          </div>
          <Tab.List
            variant="link-tabs"
            className="flex-col justify-center text-center sm:flex-row lg:justify-start"
          >
            <Tab fullWidth={false}>
              <Tab.Button className="py-4 cursor-pointer">Dashboard</Tab.Button>
            </Tab>
            <Tab fullWidth={false}>
              <Tab.Button className="py-4 cursor-pointer">
                Account & Profile
              </Tab.Button>
            </Tab>
            <Tab fullWidth={false}>
              <Tab.Button className="py-4 cursor-pointer">
                Activities
              </Tab.Button>
            </Tab>
            <Tab fullWidth={false}>
              <Tab.Button className="py-4 cursor-pointer">Tasks</Tab.Button>
            </Tab>
          </Tab.List>
        </div>
        {/* END: Profile Info */}
        <Tab.Panels className="mt-5 intro-y">
          <Tab.Panel>
            <div className="grid grid-cols-12 gap-6">
              {/* BEGIN: Daily Sales */}
              <div className="col-span-12 intro-y box lg:col-span-6">
                <div className="flex items-center px-5 py-5 border-b sm:py-3 border-slate-200/60 dark:border-darkmode-400">
                  <h2 className="mr-auto text-base font-medium">Daily Sales</h2>
                  <Menu className="ml-auto sm:hidden">
                    <Menu.Button as="a" className="block w-5 h-5">
                      <Lucide
                        icon="MoreHorizontal"
                        className="w-5 h-5 text-slate-500"
                      />
                    </Menu.Button>
                    <Menu.Items className="w-40">
                      <Menu.Item>
                        <Lucide icon="File" className="w-4 h-4 mr-2" /> Download
                        Excel
                      </Menu.Item>
                    </Menu.Items>
                  </Menu>
                  <Button
                    variant="outline-secondary"
                    className="hidden sm:flex"
                  >
                    <Lucide icon="File" className="w-4 h-4 mr-2" /> Download
                    Excel
                  </Button>
                </div>
                <div className="p-5">
                  <div className="relative flex items-center">
                    <div className="flex-none w-12 h-12 image-fit">
                      <img
                        alt="Midone Tailwind HTML Admin Template"
                        className="rounded-full"
                        src={fakerData[0].photos[0]}
                      />
                    </div>
                    <div className="ml-4 mr-auto">
                      <a href="" className="font-medium">
                        {fakerData[0].users[0].name}
                      </a>
                      <div className="mr-5 text-slate-500 sm:mr-5">
                        Bootstrap 4 HTML Admin Template
                      </div>
                    </div>
                    <div className="font-medium text-slate-600 dark:text-slate-500">
                      +$19
                    </div>
                  </div>
                  <div className="relative flex items-center mt-5">
                    <div className="flex-none w-12 h-12 image-fit">
                      <img
                        alt="Midone Tailwind HTML Admin Template"
                        className="rounded-full"
                        src={fakerData[1].photos[0]}
                      />
                    </div>
                    <div className="ml-4 mr-auto">
                      <a href="" className="font-medium">
                        {fakerData[1].users[0].name}
                      </a>
                      <div className="mr-5 text-slate-500 sm:mr-5">
                        Tailwind HTML Admin Template
                      </div>
                    </div>
                    <div className="font-medium text-slate-600 dark:text-slate-500">
                      +$25
                    </div>
                  </div>
                  <div className="relative flex items-center mt-5">
                    <div className="flex-none w-12 h-12 image-fit">
                      <img
                        alt="Midone Tailwind HTML Admin Template"
                        className="rounded-full"
                        src={fakerData[2].photos[0]}
                      />
                    </div>
                    <div className="ml-4 mr-auto">
                      <a href="" className="font-medium">
                        {fakerData[2].users[0].name}
                      </a>
                      <div className="mr-5 text-slate-500 sm:mr-5">
                        Vuejs HTML Admin Template
                      </div>
                    </div>
                    <div className="font-medium text-slate-600 dark:text-slate-500">
                      +$21
                    </div>
                  </div>
                </div>
              </div>
              {/* END: Daily Sales */}
              {/* BEGIN: Latest Tasks */}
              <Tab.Group className="col-span-12 intro-y box lg:col-span-6">
                <div className="flex items-center px-5 py-5 border-b sm:py-0 border-slate-200/60 dark:border-darkmode-400">
                  <h2 className="mr-auto text-base font-medium">
                    Latest Tasks
                  </h2>
                  <Menu className="ml-auto sm:hidden">
                    <Menu.Button as="a" className="block w-5 h-5">
                      <Lucide
                        icon="MoreHorizontal"
                        className="w-5 h-5 text-slate-500"
                      />
                    </Menu.Button>
                    <Menu.Items className="w-40">
                      <Menu.Item className="w-full" as={HeadlessTab}>
                        New
                      </Menu.Item>
                      <Menu.Item className="w-full" as={HeadlessTab}>
                        Last Week
                      </Menu.Item>
                    </Menu.Items>
                  </Menu>
                  <Tab.List
                    variant="link-tabs"
                    className="hidden w-auto ml-auto sm:flex"
                  >
                    <Tab fullWidth={false}>
                      <Tab.Button className="py-5 cursor-pointer">
                        New
                      </Tab.Button>
                    </Tab>
                    <Tab fullWidth={false}>
                      <Tab.Button className="py-5 cursor-pointer">
                        Last Week
                      </Tab.Button>
                    </Tab>
                  </Tab.List>
                </div>
                <div className="p-5">
                  <Tab.Panels>
                    <Tab.Panel>
                      <div className="flex items-center">
                        <div className="pl-4 border-l-2 border-primary dark:border-primary">
                          <a href="" className="font-medium">
                            Create New Campaign
                          </a>
                          <div className="text-slate-500">10:00 AM</div>
                        </div>
                        <FormSwitch className="ml-auto">
                          <FormSwitch.Input type="checkbox" />
                        </FormSwitch>
                      </div>
                      <div className="flex items-center mt-5">
                        <div className="pl-4 border-l-2 border-primary dark:border-primary">
                          <a href="" className="font-medium">
                            Meeting With Client
                          </a>
                          <div className="text-slate-500">02:00 PM</div>
                        </div>
                        <FormSwitch className="ml-auto">
                          <FormSwitch.Input type="checkbox" />
                        </FormSwitch>
                      </div>
                      <div className="flex items-center mt-5">
                        <div className="pl-4 border-l-2 border-primary dark:border-primary">
                          <a href="" className="font-medium">
                            Create New Repository
                          </a>
                          <div className="text-slate-500">04:00 PM</div>
                        </div>
                        <FormSwitch className="ml-auto">
                          <FormSwitch.Input type="checkbox" />
                        </FormSwitch>
                      </div>
                    </Tab.Panel>
                  </Tab.Panels>
                </div>
              </Tab.Group>
              {/* END: Latest Tasks */}
              {/* BEGIN: General Statistic */}
              <div className="col-span-12 intro-y box">
                <div className="flex items-center px-5 py-5 border-b sm:py-3 border-slate-200/60 dark:border-darkmode-400">
                  <h2 className="mr-auto text-base font-medium">
                    General Statistics
                  </h2>
                  <Menu className="ml-auto sm:hidden">
                    <Menu.Button className="block w-5 h-5">
                      <Lucide
                        icon="MoreHorizontal"
                        className="w-5 h-5 text-slate-500"
                      />
                    </Menu.Button>
                    <Menu.Items className="w-40">
                      <Menu.Item>
                        <Lucide icon="File" className="w-4 h-4 mr-2" /> Download
                        XML
                      </Menu.Item>
                    </Menu.Items>
                  </Menu>
                  <Button
                    variant="outline-secondary"
                    className="hidden sm:flex"
                  >
                    <Lucide icon="File" className="w-4 h-4 mr-2" /> Download XML
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-6 p-5 2xl:grid-cols-7">
                  <div className="2xl:col-span-2">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="col-span-2 p-5 sm:col-span-1 2xl:col-span-2 box dark:bg-darkmode-500">
                        <div className="font-medium">Net Worth</div>
                        <div className="flex items-center mt-1 sm:mt-0">
                          <div className="flex w-20 mr-4">
                            USP:
                            <span className="ml-3 font-medium text-success">
                              +23%
                            </span>
                          </div>
                          <div className="w-5/6 overflow-auto">
                            <SimpleLineChart height={51} />
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2 p-5 sm:col-span-1 2xl:col-span-2 box dark:bg-darkmode-500">
                        <div className="font-medium">Sales</div>
                        <div className="flex items-center mt-1 sm:mt-0">
                          <div className="flex w-20 mr-4">
                            USP:
                            <span className="ml-3 font-medium text-danger">
                              -5%
                            </span>
                          </div>
                          <div className="w-5/6 overflow-auto">
                            <SimpleLineChart height={51} />
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2 p-5 sm:col-span-1 2xl:col-span-2 box dark:bg-darkmode-500">
                        <div className="font-medium">Profit</div>
                        <div className="flex items-center mt-1 sm:mt-0">
                          <div className="flex w-20 mr-4">
                            USP:
                            <span className="ml-3 font-medium text-danger">
                              -10%
                            </span>
                          </div>
                          <div className="w-5/6 overflow-auto">
                            <SimpleLineChart height={51} />
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2 p-5 sm:col-span-1 2xl:col-span-2 box dark:bg-darkmode-500">
                        <div className="font-medium">Products</div>
                        <div className="flex items-center mt-1 sm:mt-0">
                          <div className="flex w-20 mr-4">
                            USP:
                            <span className="ml-3 font-medium text-success">
                              +55%
                            </span>
                          </div>
                          <div className="w-5/6 overflow-auto">
                            <SimpleLineChart height={51} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full 2xl:col-span-5">
                    <div className="flex justify-center mt-8">
                      <div className="flex items-center mr-5">
                        <div className="w-2 h-2 mr-3 rounded-full bg-primary"></div>
                        <span>Product Profit</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 mr-3 rounded-full bg-slate-300"></div>
                        <span>Author Sales</span>
                      </div>
                    </div>
                    <div className="mt-8">
                      <StackedBarChart1 height={420} />
                    </div>
                  </div>
                </div>
              </div>
              {/* END: General Statistic */}
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </>
  );
}

export default Main;
