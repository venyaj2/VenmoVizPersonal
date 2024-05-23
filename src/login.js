document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const termsCheckbox = document.getElementById("termsCheckbox");
    const termsLabel = document.querySelector("label[for='termsCheckbox'] .underline");
    const modal = document.getElementById("modal");
    const closeModal = document.getElementsByClassName("close")[0];

    termsCheckbox.addEventListener("change", function () {
        loginButton.disabled = !termsCheckbox.checked;
    });

    termsLabel.addEventListener("click",  function () {
        modal.style.display = "block";
    })

    closeModal.addEventListener("click", function () {
        modal.style.display = "none";
    })

    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();
        window.location.href = "upload.html";
    });
});