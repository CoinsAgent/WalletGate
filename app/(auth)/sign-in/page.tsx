import { baseURL } from "@/lib/demo-url";
import SignIn from "./_components/sign-in";

export default function Page() {
	return <SignIn origin={baseURL} />;
}
