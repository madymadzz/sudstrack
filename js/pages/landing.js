

/* ===========================================
        PROMOTIONS LOADER
=========================================== */
async function loadPublicPromotions() {
    const container = document.getElementById("promoContainer");
    if (!container) return;
    try {
        const res = await apiFetch("/promotions/active");
        const promos = res.data || [];
        if (promos.length === 0) {
            document.getElementById("promoSection").style.display = "none";
            return;
        }
        document.getElementById("promoSection").style.display = "block";
        container.innerHTML = promos.map(p => `
            <div style="background:var(--foam); border-radius:16px; overflow:hidden; max-width:800px; width:100%; display:flex; box-shadow:0 4px 15px rgba(0,0,0,0.05); align-items:center;">
                <img src="${p.image_url}" alt="Promo" style="width:200px; height:100%; object-fit:cover; display:block;">
                <div style="padding:24px;">
                    <h3 style="color:var(--navy); margin-bottom:8px; font-size:20px;">${p.title}</h3>
                    <p style="color:var(--muted); margin:0;">${p.description || ''}</p>
                </div>
            </div>
        `).join("");
    } catch (e) {
        console.error("Failed to load promotions");
        document.getElementById("promoSection").style.display = "none";
    }
}
document.addEventListener("DOMContentLoaded", loadPublicPromotions);


/* ===========================================
        CUSTOMER LIVE CHAT WIDGET
=========================================== */
let customerChatInterval = null;
let isChatOpen = false;

function injectChatWidget() {
    // Only inject if logged in as customer
    if (!currentUser || currentUser.role !== "Customer") return;

    const chatHtml = `
        <div id="chatWidget" style="position:fixed; bottom:30px; right:30px; z-index:999999;">
            <!-- Chat Window -->
            <div id="chatWindow" style="display:none; position:absolute; bottom:80px; right:0; width:360px; height:500px; max-height:80vh; background:#fff; border-radius:16px; box-shadow:0 15px 35px rgba(0,0,0,0.2); flex-direction:column; overflow:hidden; border:1px solid #e2e8f0; font-family: 'Nunito', sans-serif;">
                <!-- Header -->
                <div style="background:#2563eb; color:#fff; padding:16px 20px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        <span style="font-weight:700; font-size:16px;">SudsTrack Support</span>
                    </div>
                    <button id="chatCloseBtn" style="background:transparent; border:none; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:4px;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                
                <!-- Messages Area -->
                <div id="custChatMessages" style="flex:1; padding:16px; overflow-y:auto; background:#f8fafc; display:flex; flex-direction:column; gap:12px;">
                    <!-- Automated greeting -->
                    <div style="display:flex; flex-direction:column; align-items:flex-start; margin-bottom:4px;">
                        <span style="font-size:11px; color:#64748b; margin-bottom:2px; font-weight:bold;">[System] SudsTrack</span>
                        <div style="background:#fff; color:#1e293b; padding:10px 14px; border-radius:12px 12px 12px 0; max-width:85%; border:1px solid #e2e8f0; font-size:14px; box-shadow:0 1px 2px rgba(0,0,0,0.05); line-height:1.4;">
                            Hello! <i class="ph ph-hand-waving"></i> This is the official SudsTrack support chat. How can we help you today?
                        </div>
                    </div>
                </div>
                
                <!-- Input Area -->
                <div style="padding:16px; background:#fff; border-top:1px solid #e2e8f0; display:flex; gap:10px; align-items:center;">
                    <input type="text" id="custChatInput" placeholder="Type a message..." style="flex:1; padding:12px 16px; border:1px solid #cbd5e1; border-radius:99px; font-size:14px; outline:none; transition:border-color 0.2s;" onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#cbd5e1'">
                    <button id="custSendChatBtn" style="background:#2563eb; color:#fff; border:none; width:44px; height:44px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(37,99,235,0.3); flex-shrink:0;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform:translateX(-1px);"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </div>
            </div>

            <!-- Toggle Button -->
            <button id="chatToggleBtn" style="width:64px; height:64px; border-radius:50%; background:#2563eb; color:#fff; border:none; box-shadow:0 6px 16px rgba(37,99,235,0.4); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:transform 0.2s;">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </button>
        </div>
    `;
    
    document.body.insertAdjacentHTML("beforeend", chatHtml);
    
    document.getElementById("chatToggleBtn").addEventListener("click", toggleChat);
    document.getElementById("chatCloseBtn").addEventListener("click", toggleChat);
    
    document.getElementById("custSendChatBtn").addEventListener("click", sendCustomerMessage);
    document.getElementById("custChatInput").addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendCustomerMessage();
    });
}

function toggleChat() {
    isChatOpen = !isChatOpen;
    document.getElementById("chatWindow").style.display = isChatOpen ? "flex" : "none";
    
    if (isChatOpen) {
        fetchCustomerMessages();
        customerChatInterval = setInterval(fetchCustomerMessages, 5000);
    } else {
        clearInterval(customerChatInterval);
    }
}

window.fetchCustomerMessages = async function() {
    try {
        const res = await apiFetch("/chat/my-room");
        const msgs = res.data || [];
        const container = document.getElementById("custChatMessages");
        
        const autoMsg = `
            <div style="display:flex; flex-direction:column; align-items:flex-start; margin-bottom:4px;">
                <span style="font-size:11px; color:#64748b; margin-bottom:2px; font-weight:bold;">[System] SudsTrack</span>
                <div style="background:#fff; color:#1e293b; padding:10px 14px; border-radius:12px 12px 12px 0; max-width:85%; border:1px solid #e2e8f0; font-size:14px; box-shadow:0 1px 2px rgba(0,0,0,0.05); line-height:1.4;">
                    Hello! <i class="ph ph-hand-waving"></i> This is the official SudsTrack support chat. How can we help you today?
                </div>
            </div>
        `;
        
        if (msgs.length === 0) {
            container.innerHTML = autoMsg;
            return;
        }
        
        const userMsgs = msgs.map(m => {
            const isMe = m.sender_role === "Customer";
            const align = isMe ? "flex-end" : "flex-start";
            const bg = isMe ? "#2563eb" : "#fff";
            const color = isMe ? "#fff" : "#1e293b";
            const radius = isMe ? "12px 12px 0 12px" : "12px 12px 12px 0";
            const label = isMe ? "You" : `[${m.sender_role}] ${m.sender_name}`;
            const border = isMe ? "none" : "1px solid #e2e8f0";
            
            return `
                <div style="display:flex; flex-direction:column; align-items:${align}; margin-bottom:8px;">
                    <span style="font-size:11px; color:#64748b; margin-bottom:2px; font-weight:${isMe ? 'normal' : 'bold'};">${label}</span>
                    <div style="background:${bg}; color:${color}; padding:10px 14px; border-radius:${radius}; max-width:85%; border:${border}; font-size:14px; box-shadow:0 1px 2px rgba(0,0,0,0.05); line-height:1.4;">
                        ${m.message}
                    </div>
                </div>
            `;
        }).join("");
        
        container.innerHTML = autoMsg + userMsgs;
        container.scrollTop = container.scrollHeight;
    } catch (err) {}
}

window.sendCustomerMessage = async function() {
    const input = document.getElementById("custChatInput");
    const msg = input.value.trim();
    if (!msg) return;
    
    input.value = "";
    try {
        await apiFetch("/chat/my-room", { method: "POST", body: JSON.stringify({ message: msg }) });
        fetchCustomerMessages();
    } catch (err) {
        alert("Failed to send message.");
    }
}

// Global UI initializations on load

document.addEventListener("DOMContentLoaded", async () => {
    if (window.getCurrentUser) {
        window.currentUser = await window.getCurrentUser();
        const user = window.currentUser;
        
        // Update Navbar Login Button
        const loginBtn = document.getElementById("navLoginBtn");
        if (loginBtn && user) {
            loginBtn.textContent = user.role === "Customer" ? "My Account" : "Dashboard";
            
            // Calculate correct path depending on current depth
            const path = window.location.pathname;
            const depth = path.split("/").filter(Boolean).length - (path.endsWith("/") ? 0 : 1);
            const prefix = depth > 0 ? "../".repeat(depth) : "./";
            
            if (user.role === "Customer") {
                loginBtn.href = prefix + "pages/user/account.html";
            } else {
                loginBtn.href = prefix + "pages/admin/admin.html";
            }
        }
        
        if (user && user.role === "Customer") {
            injectBell();
            injectChatWidget();
        }
    }
});

/* ===========================================
        NOTIFICATIONS (RESTORED)
=========================================== */
window.injectBell = function() {
    if (!currentUser || currentUser.role !== "Customer") return;

    const navActions = document.querySelector(".nav-actions");
    if (!navActions) return;

    const bellHtml = `
        <div class="nav-bell" style="position:relative; margin-right:16px; cursor:pointer;" id="navBellBtn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <span class="bell-badge" id="bellBadge" style="display:none; position:absolute; top:-4px; right:-6px; background:#ef4444; color:#fff; font-size:10px; font-weight:bold; border-radius:10px; padding:2px 6px;">0</span>
            
            <div class="notif-dropdown" id="notifDropdown" style="display:none; position:absolute; top:36px; right:-10px; width:300px; background:#fff; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.1); border:1px solid #e2e8f0; z-index:100; max-height:400px; overflow-y:auto; cursor:default;">
                <div style="padding:12px 16px; border-bottom:1px solid #e2e8f0; font-weight:700; color:var(--navy);">Notifications</div>
                <div id="notifList" style="padding:8px;">
                    <div style="text-align:center; padding:16px; color:#94a3b8; font-size:13px;">No notifications.</div>
                </div>
            </div>
        </div>
    `;
    
    const loginBtn = document.getElementById("navLoginBtn");
    if (loginBtn) {
        loginBtn.insertAdjacentHTML("beforebegin", bellHtml);
    } else {
        navActions.insertAdjacentHTML("afterbegin", bellHtml);
    }

    const bellBtn = document.getElementById("navBellBtn");
    const dropdown = document.getElementById("notifDropdown");
    
    bellBtn.addEventListener("click", (e) => {
        if(e.target.closest("#notifDropdown")) return;
        const isVisible = dropdown.style.display === "block";
        dropdown.style.display = isVisible ? "none" : "block";
        if (!isVisible) markNotifsRead();
    });

    document.addEventListener("click", (e) => {
        if (bellBtn && !bellBtn.contains(e.target)) {
            dropdown.style.display = "none";
        }
    });

    fetchNotifs();
    setInterval(fetchNotifs, 30000);
}

window.fetchNotifs = async function() {
    try {
        const res = await apiFetch("/account/notifications");
        const notifs = res.data || [];
        const badge = document.getElementById("bellBadge");
        const list = document.getElementById("notifList");
        
        const unreadCount = notifs.filter(n => !n.is_read).length;
        if (unreadCount > 0) {
            badge.style.display = "flex";
            badge.textContent = unreadCount;
        } else {
            badge.style.display = "none";
        }
        
        if (notifs.length === 0) {
            list.innerHTML = `<div style="text-align:center; padding:16px; color:#94a3b8; font-size:13px;">No notifications.</div>`;
            return;
        }
        
        list.innerHTML = notifs.map(n => `
            <div style="padding:10px; border-bottom:1px solid #f1f5f9; background:${n.is_read ? 'transparent' : '#f8fafc'};">
                <div style="font-size:13px; color:var(--navy); font-weight:${n.is_read ? '500' : '700'}; margin-bottom:4px;">${n.message}</div>
                <div style="font-size:11px; color:#94a3b8;">${new Date(n.created_at).toLocaleString('en-PH')}</div>
            </div>
        `).join("");
    } catch (err) {}
}

window.markNotifsRead = async function() {
    try {
        await apiFetch("/account/notifications/read", { method: "PUT" });
        document.getElementById("bellBadge").style.display = "none";
    } catch (err) {}
}
