import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width="1em"
      height="1em"
      {...props}
    >
      <path fill="none" d="M0 0h256v256H0z" />
      <path
        fill="currentColor"
        d="M128 24a104 104 0 1 0 104 104A104.1 104.1 0 0 0 128 24Zm0 192a88 88 0 1 1 88-88 88.1 88.1 0 0 1-88 88Z"
        opacity={0.2}
      />
      <path
        fill="currentColor"
        d="m164.4 91.6-32.2 24.1a8 8 0 0 0-4.4 7.2v58.2a8 8 0 0 0 16 0v-53l26.2-19.6a8 8 0 1 0-8.8-14.8Z"
      />
      <path
        fill="currentColor"
        d="m91.6 91.6 40.8 30.5a8 8 0 0 1 4.4 7.2v22.2a8 8 0 0 1-16 0v-19l-34.8-26a8 8 0 1 1 8.8-14.8Z"
      />
    </svg>
  );
}
