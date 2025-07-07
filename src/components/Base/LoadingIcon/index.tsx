

import { useMemo } from "react";
import { selectDarkMode } from "@/stores/darkModeSlice";
import { useAppSelector } from "@/stores/hooks";

interface LoadingIconProps extends React.ComponentPropsWithoutRef<"span"> {
  icon:
    | "audio"
    | "ball-triangle"
    | "bars"
    | "circles"
    | "grid"
    | "hearts"
    | "oval"
    | "puff"
    | "rings"
    | "spinning-circles"
    | "tail-spin"
    | "three-dots";
  color?: string;
  darkModeColor?: string;
}

function LoadingIcon({
  icon = "spinning-circles",
  color = "#2d3748",
  darkModeColor = "#ffffff",
  ...computedProps
}: LoadingIconProps) {
  const darkMode = useAppSelector(selectDarkMode);
  const iconColor = useMemo(() => {
    return darkMode ? darkModeColor || "#ffffff" : color || "#2d3748";
  }, [darkMode, color, darkModeColor]);

  const iconSvg = useMemo(() => {
    switch (icon) {
      case "audio":
        return (
          <svg
            width="15"
            viewBox="0 0 105 80"
            xmlns="http://www.w3.org/2000/svg"
            fill={iconColor}
            className="w-full h-full"
          >
            <g transform="matrix(1 0 0 -1 0 80)">
              <rect width="10" height="20" rx="3">
                <animate
                  attributeName="height"
                  begin="0s"
                  dur="4.3s"
                  values="20;45;57;80;64;32;66;45;64;23;66;13;64;56;34;34;2;23;76;79;20"
                  calcMode="linear"
                  repeatCount="indefinite"
                />
              </rect>
              <rect x="15" width="10" height="80" rx="3">
                <animate
                  attributeName="height"
                  begin="0s"
                  dur="2s"
                  values="80;55;33;5;75;23;73;33;12;14;60;80"
                  calcMode="linear"
                  repeatCount="indefinite"
                />
              </rect>
              <rect x="30" width="10" height="50" rx="3">
                <animate
                  attributeName="height"
                  begin="0s"
                  dur="1.4s"
                  values="50;34;78;23;56;23;34;76;80;54;21;50"
                  calcMode="linear"
                  repeatCount="indefinite"
                />
              </rect>
              <rect x="45" width="10" height="30" rx="3">
                <animate
                  attributeName="height"
                  begin="0s"
                  dur="2s"
                  values="30;45;13;80;56;72;45;76;34;23;67;30"
                  calcMode="linear"
                  repeatCount="indefinite"
                />
              </rect>
              <rect x="60" width="10" height="40" rx="3">
                <animate
                  attributeName="height"
                  begin="0s"
                  dur="3s"
                  values="40;60;20;70;50;80;30;10;50;30;70;40"
                  calcMode="linear"
                  repeatCount="indefinite"
                />
              </rect>
              <rect x="75" width="10" height="60" rx="3">
                <animate
                  attributeName="height"
                  begin="0s"
                  dur="2.5s"
                  values="60;80;40;20;60;80;30;50;70;30;50;60"
                  calcMode="linear"
                  repeatCount="indefinite"
                />
              </rect>
              <rect x="90" width="10" height="70" rx="3">
                <animate
                  attributeName="height"
                  begin="0s"
                  dur="1.8s"
                  values="70;30;80;40;60;20;50;70;30;80;20;70"
                  calcMode="linear"
                  repeatCount="indefinite"
                />
              </rect>
            </g>
          </svg>
        );
      case "spinning-circles":
        return (
          <svg
            width="20"
            viewBox="0 0 58 58"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full"
          >
            <g fill="none" fillRule="evenodd">
              <g
                transform="translate(2 1)"
                stroke={iconColor}
                strokeWidth="1.5"
              >
                <circle
                  cx="42.601"
                  cy="11.462"
                  r="5"
                  fillOpacity="1"
                  fill={iconColor}
                >
                  <animate
                    attributeName="fill-opacity"
                    begin="0s"
                    dur="1.3s"
                    values="1;0;0;0;0;0;0;0"
                    calcMode="linear"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle
                  cx="49.063"
                  cy="27.063"
                  r="5"
                  fillOpacity="0"
                  fill={iconColor}
                >
                  <animate
                    attributeName="fill-opacity"
                    begin="0s"
                    dur="1.3s"
                    values="0;1;0;0;0;0;0;0"
                    calcMode="linear"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle
                  cx="42.601"
                  cy="42.663"
                  r="5"
                  fillOpacity="0"
                  fill={iconColor}
                >
                  <animate
                    attributeName="fill-opacity"
                    begin="0s"
                    dur="1.3s"
                    values="0;0;1;0;0;0;0;0"
                    calcMode="linear"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle
                  cx="27"
                  cy="49.125"
                  r="5"
                  fillOpacity="0"
                  fill={iconColor}
                >
                  <animate
                    attributeName="fill-opacity"
                    begin="0s"
                    dur="1.3s"
                    values="0;0;0;1;0;0;0;0"
                    calcMode="linear"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle
                  cx="11.399"
                  cy="42.663"
                  r="5"
                  fillOpacity="0"
                  fill={iconColor}
                >
                  <animate
                    attributeName="fill-opacity"
                    begin="0s"
                    dur="1.3s"
                    values="0;0;0;0;1;0;0;0"
                    calcMode="linear"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle
                  cx="4.938"
                  cy="27.063"
                  r="5"
                  fillOpacity="0"
                  fill={iconColor}
                >
                  <animate
                    attributeName="fill-opacity"
                    begin="0s"
                    dur="1.3s"
                    values="0;0;0;0;0;1;0;0"
                    calcMode="linear"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle
                  cx="11.399"
                  cy="11.462"
                  r="5"
                  fillOpacity="0"
                  fill={iconColor}
                >
                  <animate
                    attributeName="fill-opacity"
                    begin="0s"
                    dur="1.3s"
                    values="0;0;0;0;0;0;1;0"
                    calcMode="linear"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle
                  cx="27"
                  cy="5"
                  r="5"
                  fillOpacity="0"
                  fill={iconColor}
                >
                  <animate
                    attributeName="fill-opacity"
                    begin="0s"
                    dur="1.3s"
                    values="0;0;0;0;0;0;0;1"
                    calcMode="linear"
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            </g>
          </svg>
        );
        case "three-dots":
          return (
            <svg
              width="60"
              height="40"
              viewBox="0 0 120 40"
              xmlns="http://www.w3.org/2000/svg"
              fill={iconColor}
              className="w-full h-full"
            >
              <circle cx="15" cy="20" r="10">
                <animate
                  attributeName="cy"
                  from="20"
                  to="0"
                  begin="0s"
                  dur="0.8s"
                  values="20;0;20;40;20"
                  calcMode="linear"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx="60" cy="20" r="10">
                <animate
                  attributeName="cy"
                  from="20"
                  to="0"
                  begin="0.1s"
                  dur="0.8s"
                  values="20;0;20;40;20"
                  calcMode="linear"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx="105" cy="20" r="10">
                <animate
                  attributeName="cy"
                  from="20"
                  to="0"
                  begin="0.2s"
                  dur="0.8s"
                  values="20;0;20;40;20"
                  calcMode="linear"
                  repeatCount="indefinite"
                />
              </circle>
            </svg>
          );
      // Add other cases here...
      default:
        return null;
    }
  }, [icon, iconColor]);

  return <span {...computedProps}>{iconSvg}</span>;
}

export default LoadingIcon;

