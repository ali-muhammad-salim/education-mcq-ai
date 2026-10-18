import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function PastPapersRedirectPage() {
  redirect('/akueb/IX/physics/pastpapers');
}
