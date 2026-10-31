import { baseURL } from "@/lib/demo-url";
import SignIn from "../(auth)/sign-in/_components/sign-in";

export default function Page() {
	return <SignIn origin={baseURL} />;
}
