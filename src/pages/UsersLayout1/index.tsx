import _ from "lodash";
import clsx from "clsx";
import fakerData from "@/utils/faker";
import Button from "@/components/Base/Button";
import Pagination from "@/components/Base/Pagination";
import { FormInput, FormSelect } from "@/components/Base/Form";
import Progress from "@/components/Base/Progress";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import { Menu } from "@/components/Base/Headless";

function Main() {
  return (
    <>
      <h2 className="mt-10 text-2xl font-bold intro-y bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Users Layout</h2>
      <div className="grid grid-cols-12 gap-6 mt-5">
        <div className="backdrop-blur-xl bg-gradient-to-r from-white/60 via-white/50 to-white/40 dark:from-gray-800/60 dark:via-gray-800/50 dark:to-gray-800/40 rounded-2xl shadow-xl border border-white/30 dark:border-gray-600/40 p-6 mb-6 intro-y">
          <div className="flex flex-wrap items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="primary" className="px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 backdrop-blur-md bg-gradient-to-r from-blue-500/90 to-blue-600/90 border border-blue-400/50">
                <Lucide icon="UserPlus" className="w-4 h-4 mr-2" />
                Add New User
              </Button>
              <Menu>
                <Menu.Button as={Button} className="p-2 backdrop-blur-md bg-white/20 dark:bg-gray-700/30 border border-white/30 dark:border-gray-600/40 rounded-xl hover:bg-white/30 dark:hover:bg-gray-600/40 transition-all duration-300 hover:scale-105">
                  <Lucide icon="Plus" className="w-4 h-4" />
                </Menu.Button>
                <Menu.Items className="w-48 backdrop-blur-md bg-white/90 dark:bg-gray-800/90 border border-white/20 dark:border-gray-700/50 rounded-xl shadow-xl">
                  <Menu.Item>
                    <div className="flex items-center px-4 py-2 hover:bg-blue-500/10 dark:hover:bg-blue-400/20 rounded-lg transition-all duration-200">
                      <Lucide icon="Users" className="w-4 h-4 mr-2" /> Add Group
                    </div>
                  </Menu.Item>
                  <Menu.Item>
                    <div className="flex items-center px-4 py-2 hover:bg-blue-500/10 dark:hover:bg-blue-400/20 rounded-lg transition-all duration-200">
                      <Lucide icon="MessageCircle" className="w-4 h-4 mr-2" /> Send Message
                    </div>
                  </Menu.Item>
                </Menu.Items>
              </Menu>
            </div>
            
            <div className="hidden md:block text-sm text-slate-600 dark:text-slate-300 font-medium">
              Showing 1 to 10 of 150 entries
            </div>
            
            <div className="relative">
              <FormInput
                type="text"
                className="w-64 pr-10 backdrop-blur-md bg-white/20 dark:bg-gray-700/30 border border-white/30 dark:border-gray-600/40 rounded-xl placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-blue-400/60 focus:bg-white/30 dark:focus:bg-gray-600/40 transition-all duration-300"
                placeholder="Search users..."
              />
              <Lucide
                icon="Search"
                className="absolute inset-y-0 right-0 w-4 h-4 my-auto mr-3 text-slate-500 dark:text-slate-400"
              />
            </div>
          </div>
        </div>
        {/* BEGIN: Users Layout */}
        {_.take(fakerData, 10).map((faker, fakerKey) => (
          <div key={fakerKey} className="col-span-12 intro-y md:col-span-6 lg:col-span-4">
            <div className="backdrop-blur-xl bg-gradient-to-br from-white/50 via-white/40 to-white/30 dark:from-gray-800/50 dark:via-gray-800/40 dark:to-gray-800/30 rounded-2xl shadow-xl border border-white/30 dark:border-gray-600/40 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] relative group">
              {/* Enhanced glassmorphic inner glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 via-purple-400/5 to-pink-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10 p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white/20 dark:ring-gray-600/30 shadow-xl">
                      <img
                        alt="User Avatar"
                        className="w-full h-full object-cover"
                        src={faker.photos[0]}
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
                      {faker.users[0].name}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {faker.jobs[0]}
                    </p>
                  </div>

                  <div className="flex justify-center space-x-2 mb-4">
                    <Tippy content="Facebook">
                      <a
                        href="#"
                        className="flex items-center justify-center w-9 h-9 backdrop-blur-md bg-blue-500/20 dark:bg-blue-400/30 border border-blue-300/40 dark:border-blue-400/40 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-500/30 dark:hover:bg-blue-400/40 transition-all duration-300 hover:scale-110"
                      >
                        <Lucide icon="Facebook" className="w-4 h-4" />
                      </a>
                    </Tippy>
                    <Tippy content="Twitter">
                      <a
                        href="#"
                        className="flex items-center justify-center w-9 h-9 backdrop-blur-md bg-blue-400/20 dark:bg-blue-300/30 border border-blue-300/40 dark:border-blue-400/40 rounded-xl text-blue-500 dark:text-blue-300 hover:bg-blue-400/30 dark:hover:bg-blue-300/40 transition-all duration-300 hover:scale-110"
                      >
                        <Lucide icon="Twitter" className="w-4 h-4" />
                      </a>
                    </Tippy>
                    <Tippy content="LinkedIn">
                      <a
                        href="#"
                        className="flex items-center justify-center w-9 h-9 backdrop-blur-md bg-blue-600/20 dark:bg-blue-500/30 border border-blue-400/40 dark:border-blue-500/40 rounded-xl text-blue-700 dark:text-blue-500 hover:bg-blue-600/30 dark:hover:bg-blue-500/40 transition-all duration-300 hover:scale-110"
                      >
                        <Lucide icon="Linkedin" className="w-4 h-4" />
                      </a>
                    </Tippy>
                  </div>

                  <div className="w-full mb-4">
                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-2">
                      <span className="font-medium">Progress</span>
                      <span className="font-semibold">20%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200/30 dark:bg-gray-700/30 rounded-full overflow-hidden backdrop-blur-md border border-white/20 dark:border-gray-600/20 relative">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 w-1/5 rounded-full shadow-sm"></div>
                    </div>
                  </div>

                  <div className="flex space-x-2 w-full">
                    <Button 
                      variant="primary" 
                      className="flex-1 px-4 py-2 text-sm backdrop-blur-md bg-gradient-to-r from-blue-500/90 to-blue-600/90 border border-blue-400/50 hover:from-blue-600/90 hover:to-blue-700/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      <Lucide icon="MessageCircle" className="w-4 h-4 mr-1" />
                      Message
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      className="flex-1 px-4 py-2 text-sm backdrop-blur-md bg-white/20 dark:bg-gray-700/30 border border-white/30 dark:border-gray-600/40 hover:bg-white/30 dark:hover:bg-gray-600/40 transition-all duration-300 hover:scale-105"
                    >
                      <Lucide icon="User" className="w-4 h-4 mr-1" />
                      Profile
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {/* END: Users Layout */}
        {/* BEGIN: Pagination */}
        <div className="col-span-12 intro-y">
          <div className="backdrop-blur-xl bg-gradient-to-r from-white/60 via-white/50 to-white/40 dark:from-gray-800/60 dark:via-gray-800/50 dark:to-gray-800/40 rounded-2xl shadow-xl border border-white/30 dark:border-gray-600/40 p-6">
            <div className="flex flex-wrap items-center justify-between">
              <Pagination className="flex items-center space-x-1">
                <Pagination.Link className="backdrop-blur-md bg-white/20 dark:bg-gray-700/30 border border-white/30 dark:border-gray-600/40 hover:bg-white/30 dark:hover:bg-gray-600/40 transition-all duration-300 hover:scale-105 rounded-xl">
                  <Lucide icon="ChevronsLeft" className="w-4 h-4" />
                </Pagination.Link>
                <Pagination.Link className="backdrop-blur-md bg-white/20 dark:bg-gray-700/30 border border-white/30 dark:border-gray-600/40 hover:bg-white/30 dark:hover:bg-gray-600/40 transition-all duration-300 hover:scale-105 rounded-xl">
                  <Lucide icon="ChevronLeft" className="w-4 h-4" />
                </Pagination.Link>
                <Pagination.Link className="backdrop-blur-md bg-white/20 dark:bg-gray-700/30 border border-white/30 dark:border-gray-600/40 hover:bg-white/30 dark:hover:bg-gray-600/40 transition-all duration-300 hover:scale-105 rounded-xl">...</Pagination.Link>
                <Pagination.Link className="backdrop-blur-md bg-white/20 dark:bg-gray-700/30 border border-white/30 dark:border-gray-600/40 hover:bg-white/30 dark:hover:bg-gray-600/40 transition-all duration-300 hover:scale-105 rounded-xl">1</Pagination.Link>
                <Pagination.Link active className="backdrop-blur-md bg-gradient-to-r from-blue-500/90 to-blue-600/90 border border-blue-400/50 text-white transition-all duration-300 hover:scale-105 rounded-xl">2</Pagination.Link>
                <Pagination.Link className="backdrop-blur-md bg-white/20 dark:bg-gray-700/30 border border-white/30 dark:border-gray-600/40 hover:bg-white/30 dark:hover:bg-gray-600/40 transition-all duration-300 hover:scale-105 rounded-xl">3</Pagination.Link>
                <Pagination.Link className="backdrop-blur-md bg-white/20 dark:bg-gray-700/30 border border-white/30 dark:border-gray-600/40 hover:bg-white/30 dark:hover:bg-gray-600/40 transition-all duration-300 hover:scale-105 rounded-xl">...</Pagination.Link>
                <Pagination.Link className="backdrop-blur-md bg-white/20 dark:bg-gray-700/30 border border-white/30 dark:border-gray-600/40 hover:bg-white/30 dark:hover:bg-gray-600/40 transition-all duration-300 hover:scale-105 rounded-xl">
                  <Lucide icon="ChevronRight" className="w-4 h-4" />
                </Pagination.Link>
                <Pagination.Link className="backdrop-blur-md bg-white/20 dark:bg-gray-700/30 border border-white/30 dark:border-gray-600/40 hover:bg-white/30 dark:hover:bg-gray-600/40 transition-all duration-300 hover:scale-105 rounded-xl">
                  <Lucide icon="ChevronsRight" className="w-4 h-4" />
                </Pagination.Link>
              </Pagination>
              
              <div className="flex items-center space-x-3 mt-4 sm:mt-0">
                <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                  Items per page:
                </span>
                <FormSelect className="w-20 backdrop-blur-md bg-white/20 dark:bg-gray-700/30 border border-white/30 dark:border-gray-600/40 rounded-xl focus:border-blue-400/60 focus:bg-white/30 dark:focus:bg-gray-600/40 transition-all duration-300">
                  <option>10</option>
                  <option>25</option>
                  <option>35</option>
                  <option>50</option>
                </FormSelect>
              </div>
            </div>
          </div>
        </div>
        {/* END: Pagination */}
      </div>
    </>
  );
}

export default Main;
