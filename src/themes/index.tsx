import {
  selectTheme,
  getTheme,
  setTheme,
  themes,
  Themes,
} from "@/stores/themeSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { useEffect } from "react";

function Main() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectTheme);
  const Component = getTheme(theme as Themes).component;

  const switchTheme = (theme: Themes["name"]) => {
    dispatch(setTheme(theme));
  };

  useEffect(() => {
    const defaultTheme = themes.find((theme) => theme.name === "tinker");
    if (defaultTheme) {
      switchTheme(defaultTheme.name);
    }
  }, []);

  return (
    <div className="h-screen">
      <Component />
    </div>
  );
}

export default Main;