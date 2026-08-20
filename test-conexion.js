fetch("https://jinaagtchbfaxkxvgiwa.supabase.co/rest/v1/")
.then(r => console.log("✅ Node SÍ conecta, status:", r.status))
.catch(e => console.log("❌ Node NO conecta:", e.message));