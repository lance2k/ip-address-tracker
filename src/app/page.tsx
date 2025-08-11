import dynamic from "next/dynamic"

const IpTrackerClient = dynamic(() => import("../components/IpTrackerClient"))

export default function Home() {
  return (
    <main
      className="
        relative w-full h-screen
        flex flex-col
      "
    >
      <IpTrackerClient />
    </main>
  )
}
