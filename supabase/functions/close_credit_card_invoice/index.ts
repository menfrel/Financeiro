import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CloseInvoiceRequest {
  credit_card_id: string;
  cycle_month: string;
  paid_amount?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { credit_card_id, cycle_month, paid_amount }: CloseInvoiceRequest = await req.json();

    if (!credit_card_id || !cycle_month) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paidAmount = paid_amount || 0;

    const { data: creditCard, error: cardError } = await supabaseClient
      .from("credit_cards")
      .select("*")
      .eq("id", credit_card_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (cardError || !creditCard) {
      return new Response(
        JSON.stringify({ error: "Card not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [year, month] = cycle_month.split("-").map(Number);
    const closingDay = creditCard.closing_day;
    const dueDay = creditCard.due_day;

    const cycleStart = new Date(year, month - 2, closingDay + 1);
    const cycleEnd = new Date(year, month - 1, closingDay);
    const dueDate = new Date(year, month, dueDay);

    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const cycleStartStr = formatDate(cycleStart);
    const cycleEndStr = formatDate(cycleEnd);
    const dueDateStr = formatDate(dueDate);

    const { data: purchases, error: purchasesError } = await supabaseClient
      .from("credit_card_transactions")
      .select("amount")
      .eq("credit_card_id", credit_card_id)
      .eq("user_id", user.id)
      .gte("date", cycleStartStr)
      .lte("date", cycleEndStr)
      .gt("amount", 0);

    if (purchasesError) throw purchasesError;

    const purchasesTotal = (purchases || []).reduce(
      (sum, t) => sum + parseFloat(t.amount as any),
      0
    );

    const { data: payments, error: paymentsError } = await supabaseClient
      .from("credit_card_transactions")
      .select("amount")
      .eq("credit_card_id", credit_card_id)
      .eq("user_id", user.id)
      .gte("date", cycleStartStr)
      .lte("date", cycleEndStr)
      .lt("amount", 0);

    if (paymentsError) throw paymentsError;

    const paymentsTotal = Math.abs(
      (payments || []).reduce((sum, t) => sum + parseFloat(t.amount as any), 0)
    );

    const { data: previousInvoice, error: prevError } = await supabaseClient
      .from("credit_card_invoices")
      .select("*")
      .eq("credit_card_id", credit_card_id)
      .eq("user_id", user.id)
      .lt("cycle_end", cycleEndStr)
      .order("cycle_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (prevError) throw prevError;

    const previousBalance = previousInvoice
      ? Math.max(0, parseFloat(previousInvoice.total_due as any) - parseFloat(previousInvoice.paid_amount as any || "0"))
      : 0;

    const totalDue = Math.max(0, purchasesTotal + previousBalance - paymentsTotal);

    const { data: existingInvoice, error: existError } = await supabaseClient
      .from("credit_card_invoices")
      .select("id")
      .eq("credit_card_id", credit_card_id)
      .eq("user_id", user.id)
      .eq("cycle_start", cycleStartStr)
      .eq("cycle_end", cycleEndStr)
      .maybeSingle();

    if (existError) throw existError;

    if (existingInvoice) {
      const { error: updateError } = await supabaseClient
        .from("credit_card_invoices")
        .update({
          purchases_total: purchasesTotal,
          payments_total: paymentsTotal,
          previous_balance: previousBalance,
          total_due: totalDue,
          paid_amount: paidAmount,
          status: "closed",
        })
        .eq("id", existingInvoice.id)
        .eq("user_id", user.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabaseClient
        .from("credit_card_invoices")
        .insert({
          user_id: user.id,
          credit_card_id: credit_card_id,
          cycle_start: cycleStartStr,
          cycle_end: cycleEndStr,
          due_date: dueDateStr,
          purchases_total: purchasesTotal,
          payments_total: paymentsTotal,
          previous_balance: previousBalance,
          total_due: totalDue,
          paid_amount: paidAmount,
          status: "closed",
        });

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoice: {
          cycle_start: cycleStartStr,
          cycle_end: cycleEndStr,
          due_date: dueDateStr,
          purchases_total: purchasesTotal,
          payments_total: paymentsTotal,
          previous_balance: previousBalance,
          total_due: totalDue,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
