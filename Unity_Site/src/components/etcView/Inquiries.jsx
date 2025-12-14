import React, { useState } from 'react';
import './Inquiries.css';

function Inquiries() {
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const handleWriteClick = () => {
        setIsModalOpen(true);
    };

    const handlePostSubmit = (e) => {
        e.preventDefault();
        if (title.trim() === "" || content.trim() === "") {
            alert("Please enter both a title and content.");
            return;
        }
        
        console.log("Inquiry submitted:", { title, content });

        setTitle('');
        setContent('');
        setIsModalOpen(false);
        // TODO: Implement actual server submission logic
        alert("Your inquiry has been submitted.");
    };

    // Mock posts (should be fetched from API in real implementation)
    const mockPosts = [
        { id: 5, title: "로그인 관련 문의드립니다.", author: "UserC", date: "2025-11-17" },
        { id: 4, title: "행성 관련 문의합니다.", author: "UserA", date: "2025-11-15" },
        { id: 3, title: "사진 수정 오류", author: "UserB", date: "2025-11-14" },
        { id: 2, title: "사이트 이용 가이드 요청", author: "UserC", date: "2025-11-13" },
        { id: 1, title: "비밀번호 재설정", author: "UserD", date: "2025-11-12" },
    ];

    const filteredPosts = mockPosts.filter(post => 
        post.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="inquiries-page-wrapper scrollable">
            <main className="inquiries-main-content">
                <div className="inquiries-container">
                    <h2 className="page-title">1:1 Inquiry Board</h2>
                    
                    <div className="controls-area">
                        {/* Search input */}
                        <input
                            type="text"
                            placeholder="Search by title or content"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                        
                        {/* Write inquiry button */}
                        <button onClick={handleWriteClick} className="write-button primary-btn">
                            + Write Inquiry
                        </button>
                    </div>

                    {/* Posts table */}
                    <div className="table-wrapper">
                        <table className="posts-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '10%' }}>No.</th>
                                    <th style={{ width: '55%' }}>Title</th>
                                    <th style={{ width: '15%' }}>Author</th>
                                    <th style={{ width: '20%' }}>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPosts.length > 0 ? (
                                    filteredPosts.map(post => (
                                        <tr key={post.id}>
                                            <td>{post.id}</td>
                                            <td className="post-title-cell">{post.title}</td>
                                            <td>{post.author}</td>
                                            <td>{post.date}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center' }}>
                                            No results found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Inquiry modal */}
                {isModalOpen && (
                    <div className="modal-overlay">
                        <div className="inquiry-modal-content">
                            <h3>Write a New Inquiry</h3>
                            <form onSubmit={handlePostSubmit}>
                                <div className="form-group">
                                    <label htmlFor="modal-title">Title</label>
                                    <input
                                        id="modal-title"
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                        placeholder="Enter inquiry title."
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="modal-content">Inquiry Content</label>
                                    <textarea
                                        id="modal-content"
                                        rows="8"
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        required
                                        placeholder="Enter detailed inquiry content."
                                    />
                                </div>
                                <div className="modal-actions">
                                    <button type="submit" className="submit-button primary-btn">Submit</button>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsModalOpen(false)} 
                                        className="cancel-button secondary-btn"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default Inquiries;
