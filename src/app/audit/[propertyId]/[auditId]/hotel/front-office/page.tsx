"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { HotelSectionForm } from "@/components/audit/hotel-section-form";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function FrontOfficePage({ params }: { params: Promise<{ propertyId: string; auditId: string }> }) {
  const { propertyId, auditId } = use(params);
  const router = useRouter();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Front Office Operations</h2>
        <p className="text-sm text-gray-500 mt-1">Section 1 of 10</p>
      </div>
      <HotelSectionForm auditId={auditId} sectionKey="frontOffice" />
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={() => router.back()}>← Back</Button>
        <Button onClick={() => router.push(`/audit/${propertyId}/${auditId}/maintenance/rooms`)}>
          Next: Guest Rooms <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
