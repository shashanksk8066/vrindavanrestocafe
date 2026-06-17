import { useState, useEffect, useCallback } from 'react';
import { db } from '../../config/firebase';
import { collection, query, getDocs, updateDoc, doc, getDoc, where } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Calendar, Phone, MapPin, Download, Gift } from 'lucide-react';
import { generateNumericId } from '../../utils/formatId';

const AdminInstantOrders = () => {
    const [bookings, setBookings] = useState([]);
    const [users, setUsers] = useState({});
    const [addresses, setAddresses] = useState({});
    const [deliveryBoys, setDeliveryBoys] = useState([]);
        const [loading, setLoading] = useState(true);
    
    // Filters and State
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'completed'
    const [selectedBookings, setSelectedBookings] = useState([]);
    const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState('');
    const [assigning, setAssigning] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Setup start and end of the selected day
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            // Fetch Instant Orders
            const bookingsSnap = await getDocs(collection(db, 'instantOrders'));
            const bookingsData = [];
            
            // Collect unique user and address IDs
            const userIds = new Set();
            const addressIds = new Set();
            
            bookingsSnap.forEach(docSnap => {
                const data = docSnap.data();
                const bookingDate = new Date(data.createdAt);
                
                // Only consider bookings for the selected date
                if (bookingDate >= startOfDay && bookingDate <= endOfDay) {
                    bookingsData.push({ id: docSnap.id, ...data });
                    if (data.userId) userIds.add(data.userId);
                    if (data.addressId) addressIds.add(data.addressId);
                }
            });

            // Fetch Users info
            const usersData = { ...users };
            for (let uid of userIds) {
                if (!usersData[uid]) {
                    try {
                        const uDoc = await getDoc(doc(db, 'users', uid));
                        if (uDoc.exists()) {
                            usersData[uid] = uDoc.data();
                        }
                    } catch (err) {
                        console.warn(`Could not fetch user ${uid}:`, err);
                    }
                }
            }

            // Fetch Addresses info
            const addressesData = { ...addresses };
            for (let aid of addressIds) {
                if (!addressesData[aid]) {
                    try {
                        const aDoc = await getDoc(doc(db, 'addresses', aid));
                        if (aDoc.exists()) {
                            addressesData[aid] = aDoc.data();
                        }
                    } catch (err) {
                        console.warn(`Could not fetch address ${aid}:`, err);
                    }
                }
            }

            // Fetch Delivery Boys
            const boysQ = query(collection(db, 'users'), where('role', '==', 'delivery'));
            const boysSnap = await getDocs(boysQ);
            const boysList = [];
            boysSnap.forEach(docSnap => {
                boysList.push({ id: docSnap.id, ...docSnap.data() });
            });

            bookingsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setBookings(bookingsData);
            setUsers(usersData);
            setAddresses(addressesData);
            setDeliveryBoys(boysList);

            // Clear selection when data changes
            setSelectedBookings([]);
        } catch (error) {
            console.error("Error fetching bookings data:", error);
            alert("Failed to load bookings");
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchData();
    }, [fetchData]);


    const handleSelectAll = (e, filteredBookings) => {
        if (e.target.checked) {
            setSelectedBookings(filteredBookings.map(b => b.id));
        } else {
            setSelectedBookings([]);
        }
    };

    const handleSelectOne = (id) => {
        setSelectedBookings(prev => 
            prev.includes(id) ? prev.filter(bId => bId !== id) : [...prev, id]
        );
    };

    const handleAssignDelivery = async () => {
        if (!selectedDeliveryBoy) return alert("Please select a delivery boy");
        if (selectedBookings.length === 0) return alert("Please select at least one booking");

        setAssigning(true);
        try {
            for (let bookingId of selectedBookings) {
                await updateDoc(doc(db, 'instantOrders', bookingId), {
                    deliveryBoyId: selectedDeliveryBoy,
                    status: 'assigned',
                    updatedAt: new Date().toISOString()
                });
            }
            alert("Successfully assigned delivery boy to selected bookings");
            fetchData(); // refresh
        } catch (error) {
            console.error("Error assigning:", error);
            alert("Failed to assign delivery boy");
        } finally {
            setAssigning(false);
            setSelectedDeliveryBoy('');
            setSelectedBookings([]);
        }
    };

        const exportForCooks = () => {
        const pendingBookings = bookings.filter(b => b.status === 'pending' || b.status === 'assigned');
        const itemCounts = {};
        
        pendingBookings.forEach(booking => {
            if (booking.items && Array.isArray(booking.items)) {
                booking.items.forEach(item => {
                    const itemName = item.name || 'Unknown Item';
                    const qty = item.quantity || 1;
                    itemCounts[itemName] = (itemCounts[itemName] || 0) + qty;
                });
            }
            if (booking.freeFood) {
                const itemName = `${booking.freeFood.name} (FREE)`;
                itemCounts[itemName] = (itemCounts[itemName] || 0) + 1;
            }
        });

        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('Vrindavan Resto Cafe Kitchen Order Ticket', 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date: ${selectedDate}`, 105, 30, { align: 'center' });
        
        // Table
        const tableData = Object.entries(itemCounts).map(([name, count]) => [name, count.toString()]);
        
        autoTable(doc, {
            startY: 40,
            head: [['Item Name', 'Total Quantity']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 12, cellPadding: 6 },
            margin: { left: 20, right: 20 }
        });

        doc.save(`cooks_export_${selectedDate}.pdf`);
    };

        const exportForDelivery = () => {
        const pendingBookings = bookings.filter(b => b.status === 'pending' || b.status === 'assigned');
        
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        let yPos = 20;

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Vrindavan Resto Cafe Delivery Manifest', pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date: ${selectedDate}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        pendingBookings.forEach((booking) => {
            // Check if we need a new page
            if (yPos > pageHeight - 60) {
                doc.addPage();
                yPos = 20;
            }

            const user = users[booking.userId] || {};
            const address = addresses[booking.addressId] || {};
            const userName = user.name || 'Unknown User';
            const userPhone = user.phone || 'No Phone';
            const fullAddress = address.fullAddress || 'No Address';
            
            
            // Draw receipt box
            doc.setDrawColor(200, 200, 200);
            doc.setFillColor(250, 250, 250);
            doc.roundedRect(15, yPos, pageWidth - 30, 80, 3, 3, 'FD');
            
            yPos += 10;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`Order #${generateNumericId(booking.id)}`, 20, yPos);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Customer:`, 20, yPos + 10);
            doc.setFont('helvetica', 'bold');
            doc.text(userName, 45, yPos + 10);
            
            doc.setFont('helvetica', 'normal');
            doc.text(`Phone:`, 20, yPos + 18);
            doc.setFont('helvetica', 'bold');
            doc.text(userPhone, 45, yPos + 18);
            
            doc.setFont('helvetica', 'normal');
            doc.text(`Address:`, 20, yPos + 26);
            doc.setFont('helvetica', 'bold');
            const addressLines = doc.splitTextToSize(fullAddress, pageWidth - 70);
            doc.text(addressLines, 45, yPos + 26);
            
                        const addressHeight = addressLines.length * 5;
            
            // Items list on the right side
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Items:', pageWidth / 2 + 10, yPos + 10);
            doc.setFont('helvetica', 'normal');
            
            let itemY = yPos + 18;
            
            if (booking.items) {
                booking.items.forEach(i => {
                    const name = i.name || 'Unknown Item';
                    const qty = i.quantity || 1;
                    doc.text(`- ${name} (x${qty})`, pageWidth / 2 + 10, itemY);
                    itemY += 6;
                });
            }
            if (booking.freeFood) {
                doc.setFont('helvetica', 'bold');
                doc.text(`- ${booking.freeFood.name} (FREE) (x1)`, pageWidth / 2 + 10, itemY);
                doc.setFont('helvetica', 'normal');
                itemY += 6;
            }
            
            yPos += Math.max(addressHeight + 35, (itemY - yPos) + 5);
        });
        
        doc.save(`delivery_instant_${selectedDate}.pdf`);
    };

        // Filtered bookings based on tab
    const filteredBookings = bookings.filter(b => {
        if (activeTab === 'pending') {
            return b.status !== 'delivered' && b.status !== 'completed';
        } else {
            return b.status === 'delivered' || b.status === 'completed';
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Instant Orders</h1>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                    <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-xl border border-gray-200 w-full sm:w-auto">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="outline-none text-sm font-medium text-gray-700 bg-transparent"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="border-b border-gray-100">
                    <div className="flex space-x-8 px-6">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === 'pending'
                                    ? 'border-amber-500 text-amber-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Pending
                        </button>
                        <button
                            onClick={() => setActiveTab('completed')}
                            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === 'completed'
                                    ? 'border-amber-500 text-amber-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Completed
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {/* Actions Bar for Pending Tab */}
                    {activeTab === 'pending' && (
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <div className="flex items-center space-x-3 w-full md:w-auto">
                                <select
                                    value={selectedDeliveryBoy}
                                    onChange={(e) => setSelectedDeliveryBoy(e.target.value)}
                                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block w-full p-2.5 outline-none transition-colors"
                                >
                                    <option value="">Select Delivery Boy</option>
                                    {deliveryBoys.map(boy => (
                                        <option key={boy.id} value={boy.id}>{boy.name || boy.email}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleAssignDelivery}
                                    disabled={assigning || selectedBookings.length === 0}
                                    className="whitespace-nowrap px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold rounded-lg hover:shadow-lg disabled:opacity-50 transition-all shadow-md"
                                >
                                    {assigning ? 'Assigning...' : `Assign (${selectedBookings.length})`}
                                </button>
                            </div>
                            <div className="flex items-center space-x-3 w-full md:w-auto">
                                <button onClick={exportForCooks} className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 border border-amber-200 bg-amber-50 text-amber-700 text-sm font-semibold rounded-lg hover:bg-amber-100 transition-colors">
                                    <Download className="w-4 h-4 mr-2" />
                                    Export Cooks
                                </button>
                                <button onClick={exportForDelivery} className="flex-1 md:flex-none flex items-center justify-center px-4 py-2.5 border border-amber-200 bg-amber-50 text-amber-700 text-sm font-semibold rounded-lg hover:bg-amber-100 transition-colors">
                                    <Download className="w-4 h-4 mr-2" />
                                    Export Delivery
                                </button>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="py-24 flex flex-col items-center justify-center">
                            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-500 font-medium">Loading orders...</p>
                        </div>
                    ) : filteredBookings.length === 0 ? (
                        <div className="py-24 bg-white rounded-3xl border border-gray-100 text-center shadow-sm">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Calendar className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">No Orders Found</h3>
                            <p className="text-gray-500 mt-2">There are no {activeTab} instant orders for this date.</p>
                        </div>
                    ) : (
                        <div>
                            {activeTab === 'pending' && (
                                <div className="mb-4 flex items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                    <input 
                                        type="checkbox" 
                                        id="selectAll"
                                        onChange={(e) => handleSelectAll(e, filteredBookings)}
                                        checked={selectedBookings.length === filteredBookings.length && filteredBookings.length > 0}
                                        className="w-5 h-5 text-amber-500 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 mr-3 cursor-pointer"
                                    />
                                    <label htmlFor="selectAll" className="text-sm font-semibold text-gray-700 cursor-pointer select-none">
                                        Select All {filteredBookings.length} Orders
                                    </label>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredBookings.map((booking) => {
                                    const user = users[booking.userId];
                                    const address = addresses[booking.addressId];
                                    const isSelected = selectedBookings.includes(booking.id);
                                    
                                    return (
                                        <div 
                                            key={booking.id} 
                                            onClick={() => activeTab === 'pending' && handleSelectOne(booking.id)}
                                            className={`bg-white rounded-3xl border-2 transition-all duration-300 relative overflow-hidden group flex flex-col ${
                                                isSelected 
                                                    ? 'border-amber-500 shadow-lg shadow-amber-500/10' 
                                                    : 'border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 cursor-pointer'
                                            }`}
                                        >
                                            {/* Top Banner Area */}
                                            <div className={`h-2 ${isSelected ? 'bg-amber-500' : 'bg-gray-100'}`}></div>
                                            
                                            <div className="p-6 flex-1 flex flex-col">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="text-[10px] text-gray-400 font-mono font-bold uppercase tracking-widest mb-1" title={booking.id}>Order #{generateNumericId(booking.id)}</div>
                                                        <h3 className="font-bold text-lg text-gray-900">{user?.name || 'Unknown'}</h3>
                                                    </div>
                                                    
                                                    {activeTab === 'pending' ? (
                                                        <div className="flex items-center justify-center w-6 h-6">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isSelected}
                                                                onChange={() => {}} // handled by parent div onClick
                                                                className="w-5 h-5 text-amber-500 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 pointer-events-none"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                            booking.status === 'delivered' || booking.status === 'completed'
                                                                ? 'bg-green-100 text-green-700'
                                                                : booking.status === 'assigned'
                                                                ? 'bg-blue-100 text-blue-700'
                                                                : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {booking.status}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Contact & Location Info */}
                                                <div className="space-y-2 mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100/50">
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mr-3 shadow-sm">
                                                            <Phone className="w-4 h-4 text-gray-400" />
                                                        </div>
                                                        <span className="font-medium">{user?.phone || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex items-start text-sm text-gray-600">
                                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mr-3 shadow-sm shrink-0">
                                                            <MapPin className="w-4 h-4 text-gray-400" />
                                                        </div>
                                                        <span className="mt-1.5 leading-snug truncate" title={address?.fullAddress}>
                                                            {address?.fullAddress || 'No Address'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Order Items */}
                                                <div className="flex-1 mb-6">
                                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Order Items</h4>
                                                    <div className="space-y-2">
                                                        {booking.items?.map((item, i) => (
                                                            <div key={i} className="flex justify-between items-center text-sm">
                                                                <span className="font-medium text-gray-800 flex items-center">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-2"></span>
                                                                    {item.name || 'Unknown'}
                                                                </span>
                                                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold text-xs">x{item.quantity || 1}</span>
                                                            </div>
                                                        ))}
                                                        {booking.freeFood && (
                                                            <div className="flex justify-between items-center text-sm mt-3 pt-3 border-t border-dashed border-gray-200">
                                                                <div className="font-bold text-orange-600 flex items-center bg-orange-50 px-2 py-1 rounded-md border border-orange-100">
                                                                    <Gift className="w-3.5 h-3.5 mr-1.5" />
                                                                    {booking.freeFood.name} (FREE)
                                                                </div>
                                                                <div className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 text-xs">x1</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Status Footer */}
                                                <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-end">
                                                    {booking.status === 'assigned' && booking.deliveryBoyId && (
                                                        <div className="flex items-center text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                                                            Boy: {deliveryBoys.find(b => b.id === booking.deliveryBoyId)?.name?.split(' ')[0] || 'Unknown'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminInstantOrders;
