"use client"
import React, { useState } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Filter, MessageSquare, Plus, Settings, User, Send, Paperclip, MoreVertical, Check, CheckCheck } from 
'lucide-react'

export default function WhatsappChatPage() {
  const [isLinked, setIsLinked] = useState(false);
  const [activeTab, setActiveTab] = useState('Semua');
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messageText, setMessageText] = useState("");

  const mockChats = [
    {
      id: 1,
      name: "Pak Budi",
      phone: "+62 812-3456-7890",
      avatar: "B",
      lastMessage: "Ikan tenggirinya masih ada 10kg?",
      time: "10:24",
      unread: 2,
      type: "Manual",
      messages: [
        { id: 1, sender: "user", text: "Selamat pagi, Pak. Stok ikan tenggiri ada?", time: "10:20" },
        { id: 2, sender: "me", text: "Selamat pagi Pak Budi. Sebentar saya cek di sistem ya.", time: "10:22" },
        { id: 3, sender: "user", text: "Ikan tenggirinya masih ada 10kg?", time: "10:24" }
      ]
    },
    {
      id: 2,
      name: "Bu Siska (Supplier)",
      phone: "+62 813-9876-5432",
      avatar: "S",
      lastMessage: "Oke, besok saya kirim 50kg Tuna.",
      time: "Kemarin",
      unread: 0,
      type: "Manual",
      messages: [
        { id: 1, sender: "me", text: "Bu Siska, tolong kirim Tuna 50kg besok pagi ya.", time: "15:00" },
        { id: 2, sender: "user", text: "Oke, besok saya kirim 50kg Tuna.", time: "15:05" }
      ]
    },
    {
      id: 3,
      name: "Toko Makmur",
      phone: "+62 856-1122-3344",
      avatar: "TM",
      lastMessage: "Terima kasih, invoice sudah kami terima.",
      time: "Kemarin",
      unread: 0,
      type: "Dibalas AI",
      messages: [
        { id: 1, sender: "user", text: "Tolong kirimkan invoice untuk pesanan SO-0012", time: "11:00" },
        { id: 2, sender: "me", text: "Halo! Ini adalah pesan otomatis. Invoice Anda telah dikirimkan ke email terdaftar.", time: "11:01", isAi: true },
        { id: 3, sender: "user", text: "Terima kasih, invoice sudah kami terima.", time: "11:05" }
      ]
    }
  ];

  if (!isLinked) {
    return (
      <div className="flex h-[calc(100vh-64px)] -mx-4 -mt-4 bg-[#f0f2f5]">
        {/* Left Sidebar Empty */}
        <div className="w-[350px] bg-card border-r flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <h1 className="font-bold text-lg">Semua Obrolan</h1>
            </div>
            <div className="flex gap-2 text-muted-foreground">
              <User className="w-5 h-5 cursor-pointer" />
              <Settings className="w-5 h-5 cursor-pointer" />
              <Plus className="w-5 h-5 cursor-pointer text-emerald-600" />
            </div>
          </div>
          
          <div className="p-3 border-b flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cari chat, nama, atau nomor..." className="pl-9 h-9 bg-gray-100 border-none rounded-full" />
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-gray-100">
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex px-4 py-2 border-b gap-4 text-sm font-medium">
            <div className="flex items-center gap-2 cursor-pointer">
              <span className="text-emerald-700">Semua</span>
              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs">0</span>
            </div>
            <div className="flex items-center gap-2 cursor-pointer text-muted-foreground">
              <span>Dibalas AI</span>
              <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs">0</span>
            </div>
            <div className="flex items-center gap-2 cursor-pointer text-muted-foreground">
              <span>Manual</span>
              <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs">0</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="font-bold text-lg mb-2">Belum Ada Obrolan</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Hubungkan WhatsApp Anda untuk mulai menerima dan membalas pesan pelanggan secara otomatis.
            </p>
            <Button className="bg-emerald-600 hover:bg-emerald-700 w-full rounded-full" onClick={() => setIsLinked(true)}>
              Hubungkan WhatsApp
            </Button>
          </div>
        </div>

        {/* Right Main Empty */}
        <div className="flex-1 bg-[#f0f2f5] flex flex-col items-center justify-center text-muted-foreground">
          <MessageSquare className="w-16 h-16 opacity-20 mb-4" />
          <p>Pilih percakapan untuk mulai merespons</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-64px)] -mx-4 -mt-4 bg-[#f0f2f5]">
      {/* Left Sidebar Active */}
      <div className="w-[350px] bg-card border-r flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            <h1 className="font-bold text-lg">Semua Obrolan</h1>
          </div>
          <div className="flex gap-4 text-muted-foreground">
            <User className="w-5 h-5 cursor-pointer hover:text-emerald-600" />
            <Settings className="w-5 h-5 cursor-pointer hover:text-emerald-600" onClick={() => setIsLinked(false)}  />
            <Plus className="w-5 h-5 cursor-pointer text-emerald-600" />
          </div>
        </div>
        
        <div className="p-3 border-b flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Cari chat, nama, atau nomor..." className="pl-9 h-9 bg-gray-100 border-none rounded-full" />
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-gray-100">
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex px-4 py-2 border-b gap-4 text-sm font-medium overflow-x-auto no-scrollbar">
          {['Semua', 'Dibalas AI', 'Manual'].map(tab => (
            <div 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 cursor-pointer whitespace-nowrap ${activeTab === tab ? 'text-emerald-700' : 'text-muted-foreground'}`}
            >
              <span>{tab}</span>
              <span className={`${activeTab === tab ? 'bg-emerald-100' : 'bg-gray-100'} px-2 py-0.5 rounded-full text-xs`}>
                {tab === 'Semua' ? 3 : tab === 'Dibalas AI' ? 1 : 2}
              </span>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {mockChats
            .filter(c => activeTab === 'Semua' || c.type === activeTab)
            .map(chat => (
            <div 
              key={chat.id} 
              onClick={() => setActiveChat(chat)}
              className={`flex items-center gap-3 p-3 cursor-pointer border-b hover:bg-gray-50 ${activeChat?.id === chat.id ? 'bg-gray-100' : ''}`}
            >
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
                {chat.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className="font-bold truncate text-[15px]">{chat.name}</h4>
                  <span className={`text-xs flex-shrink-0 ${chat.unread ? 'text-emerald-600 font-bold' : 'text-muted-foreground'}`}>{chat.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                  {chat.unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center flex-shrink-0 ml-2">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Main Active */}
      <div className="flex-1 bg-[#efeae2] flex flex-col relative overflow-hidden" style={{ backgroundImage: "url('https://static.whatsapp.net/whatsapp-web-bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png')", opacity: 0.95 }}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="h-16 bg-[#f0f2f5] border-b flex items-center justify-between px-4 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  {activeChat.avatar}
                </div>
                <div>
                  <h3 className="font-bold text-[15px]">{activeChat.name}</h3>
                  <p className="text-xs text-muted-foreground">{activeChat.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <Search className="w-5 h-5 cursor-pointer" />
                <MoreVertical className="w-5 h-5 cursor-pointer" />
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-3">
              <div className="text-center mb-4">
                <span className="bg-[#e1f3fb] text-gray-600 text-xs py-1 px-3 rounded-lg shadow-sm">
                  Hari Ini
                </span>
              </div>
              
              {activeChat.messages.map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-lg p-2 px-3 shadow-sm relative ${msg.sender === 'me' ? 'bg-[#d9fdd3]' : 'bg-card'}`}>
                    {msg.isAi && (
                      <div className="text-[10px] text-emerald-700 font-bold mb-1 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Dijawab oleh AI
                      </div>
                    )}
                    <p className="text-[14px] text-gray-800 leading-relaxed pb-3">{msg.text}</p>
                    <div className="absolute right-2 bottom-1 flex items-center gap-1">
                      <span className="text-[10px] text-gray-500">{msg.time}</span>
                      {msg.sender === 'me' && <CheckCheck className="w-3 h-3 text-blue-500" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="bg-[#f0f2f5] p-3 flex items-center gap-3">
              <Paperclip className="w-6 h-6 text-muted-foreground cursor-pointer" />
              <Input 
                placeholder="Ketik pesan" 
                className="flex-1 bg-card border-none rounded-xl h-10 shadow-sm"
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                onKeyDown={e => {
                  if(e.key === 'Enter' && messageText.trim()){
                    activeChat.messages.push({
                      id: Date.now(),
                      sender: 'me',
                      text: messageText,
                      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    });
                    setMessageText("");
                  }
                }}
              />
              <Button size="icon" className="rounded-full bg-emerald-600 hover:bg-emerald-700 h-10 w-10 flex-shrink-0"
                onClick={() => {
                  if(messageText.trim()){
                    activeChat.messages.push({
                      id: Date.now(),
                      sender: 'me',
                      text: messageText,
                      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    });
                    setMessageText("");
                  }
                }}
              >
                <Send className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-[#f0f2f5] h-full">
            <MessageSquare className="w-16 h-16 opacity-20 mb-4" />
            <h2 className="text-xl font-medium text-gray-600 mb-2">WhatsApp ERP Integrasi</h2>
            <p className="text-sm">Pilih percakapan untuk mulai merespons atau mengobrol.</p>
          </div>
        )}
      </div>
    </div>
  )
}

