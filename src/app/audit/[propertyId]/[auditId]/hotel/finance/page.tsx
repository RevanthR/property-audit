"use client";
import { use } from "react";
import { useRouter } from "next/navigation";
import { HotelSectionForm } from "@/components/audit/hotel-section-form";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { StepFooter } from "@/components/audit/step-footer";

export default function Page({ params }: { params: Promise<{ propertyId: string; auditId: string }> }) {
  const { propertyId, auditId } = use(params);
  const router = useRouter();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Finance & Compliance</h2>
        <p className="text-sm text-gray-500 mt-1">Section 8 of 10</p>
      </div>
      <HotelSectionForm auditId={auditId} sectionKey="finance" />
      <StepFooter>
        <Button variant="outline" onClick={() => router.back()}>← Back</Button>
        <Button onClick={() => router.push(`/audit/${propertyId}/${auditId}/hotel/hr`)}>
          Next: HR <ArrowRight className="h-4 w-4" />
        </Button>
      </StepFooter>
    </div>
  );
}
