import "@/assets/css/themes/tinker/side-nav.css";
import { Transition } from "react-transition-group";
import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { selectMenu } from "@/stores/menuSlice";
import { useAppSelector } from "@/stores/hooks";
import { FormattedMenu, linkTo, nestedMenu, enter, leave } from "./simple-menu";
import Lucide from "@/components/Base/Lucide";
import Tippy from "@/components/Base/Tippy";
import logoUrl from "@/assets/images/logo.png";
import clsx from "clsx";
import TopBar from "@/components/Themes/Tinker/TopBar";
import MobileMenu from "@/components/MobileMenu";

function Main() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formattedMenu, setFormattedMenu] = useState<Array<FormattedMenu | "divider">>([]);
  const menuStore = useAppSelector(selectMenu("simple-menu"));
  const menu = () => nestedMenu(menuStore, location);

  useEffect(() => {
    setFormattedMenu(menu());
  }, [menuStore, location.pathname]);

  return (
    <div className="tinker">
      <MobileMenu />
      <div className="flex mt-[4.7rem] md:mt-0 overflow-hidden">
        {/* BEGIN: Simple Menu */}
        <nav className="py-5 side-nav side-nav--simple hidden md:block md:w-[72px] xl:w-[72px] px-2 pb-16 overflow-x-hidden z-10 bg-gray-100">
          <ul className="space-y-2">
            {/* BEGIN: First Child */}
            {formattedMenu.map((menu, menuKey) =>
              menu == "divider" ? (
                <li className="my-2 side-nav__divider" key={menuKey}></li>
              ) : (
                <li key={menuKey}>
                  <Tippy
                    as="a"
                    content={menu.title}
                    options={{
                      placement: "left",
                    }}
                    href={menu.subMenu ? "#" : menu.pathname}
                    onClick={(event: React.MouseEvent) => {
                      event.preventDefault();
                      linkTo(menu, navigate);
                      setFormattedMenu([...formattedMenu]);
                    }}
                    className={clsx([
                      "flex items-center p-2 my-1 rounded hover:bg-gray-200",
                      menu.active ? "bg-gray-300" : "",
                    ])}
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      <Lucide icon={menu.icon} className="text-gray-700" />
                    </div>
                  </Tippy>
                  {/* BEGIN: Second Child */}
                  {menu.subMenu && (
                    <Transition
                      in={menu.activeDropdown}
                      onEnter={enter}
                      onExit={leave}
                      timeout={300}
                    >
                      <ul
                        className={clsx({
                          "side-menu__sub-open": menu.activeDropdown,
                        })}
                      >
                        {menu.subMenu.map((subMenu, subMenuKey) => (
                          <li key={subMenuKey}>
                            <Tippy
                              as="a"
                              content={subMenu.title}
                              options={{
                                placement: "left",
                              }}
                              href={subMenu.subMenu ? "#" : subMenu.pathname}
                              onClick={(event: React.MouseEvent) => {
                                event.preventDefault();
                                linkTo(subMenu, navigate);
                                setFormattedMenu([...formattedMenu]);
                              }}
                              className={clsx([
                                "flex items-center p-1 my-1 rounded hover:bg-gray-200",
                                subMenu.active ? "bg-gray-300" : "",
                              ])}
                            >
                              <div className="w-4 h-4 flex items-center justify-center">
                                <Lucide icon={subMenu.icon} className="text-gray-700" />
                              </div>
                            </Tippy>
                            {/* BEGIN: Third Child */}
                            {subMenu.subMenu && (
                              <Transition
                                in={subMenu.activeDropdown}
                                onEnter={enter}
                                onExit={leave}
                                timeout={300}
                              >
                                <ul
                                  className={clsx({
                                    "side-menu__sub-open": subMenu.activeDropdown,
                                  })}
                                >
                                  {subMenu.subMenu.map((lastSubMenu, lastSubMenuKey) => (
                                    <li key={lastSubMenuKey}>
                                      <Tippy
                                        as="a"
                                        content={lastSubMenu.title}
                                        options={{
                                          placement: "left",
                                        }}
                                        href={
                                          lastSubMenu.subMenu ? "#" : lastSubMenu.pathname
                                        }
                                        onClick={(event: React.MouseEvent) => {
                                          event.preventDefault();
                                          linkTo(lastSubMenu, navigate);
                                          setFormattedMenu([
                                            ...formattedMenu,
                                          ]);
                                        }}
                                        className={clsx([
                                          "flex items-center p-1 my-1 rounded hover:bg-gray-200",
                                          lastSubMenu.active ? "bg-gray-300" : "",
                                        ])}
                                      >
                                        <div className="w-4 h-4 flex items-center justify-center">
                                          <Lucide icon={lastSubMenu.icon} className="text-gray-700" />
                                        </div>
                                      </Tippy>
                                    </li>
                                  ))}
                                </ul>
                              </Transition>
                            )}
                            {/* END: Third Child */}
                          </li>
                        ))}
                      </ul>
                    </Transition>
                  )}
                  {/* END: Second Child */}
                </li>
              )
            )}
            {/* END: First Child */}
          </ul>
        </nav>
        {/* END: Simple Menu */}
        {/* BEGIN: Content */}
        <div className="min-h-screen max-w-full md:max-w-none bg-slate-100 flex-1 pb-10 px-2 md:px-2 relative md:ml-4 dark:bg-darkmode-700 before:content-[''] before:w-full before:h-px before:block after:content-[''] after:z-[-1] after:rounded-[40px_0px_0px_0px] after:w-full after:inset-y-0 after:absolute after:left-0 after:bg-white/10 after:mt-8 after:-ml-4 after:dark:bg-darkmode-400/50 after:hidden md:after:block">
          <TopBar />
          <Outlet />
        </div>
        {/* END: Content */}
      </div>
    </div>
  );
}

export default Main;
