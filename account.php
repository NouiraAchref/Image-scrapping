<?php
defined('ABSPATH') || exit;

$current_user = wp_get_current_user();
?>

<div class="profile-dashboard">
    <div class="profile-header">
        <div class="profile-picture">
            <?php echo get_avatar($current_user->ID, 128); ?>
        </div>
        <div class="profile-info">
            <h2>Welcome, <?php echo esc_html($current_user->display_name); ?>!</h2>
            <p>Email: <?php echo esc_html($current_user->user_email); ?></p>
        </div>
    </div>

    <div class="profile-actions">
        <button class="button" data-section="orders">View Orders</button>
        <button class="button" data-section="profile">Edit Profile</button>
        <button class="button" data-section="addresses">Manage Addresses</button>
        <a href="<?php echo esc_url(wc_logout_url()); ?>" class="button">Logout</a>
    </div>

    <div class="profile-content">
        <div id="orders" class="content-section" style="display: none;">
            <h3>Your Orders</h3>
            <?php
            $customer_orders = wc_get_orders(array(
                'customer' => get_current_user_id(),
                'limit'    => 5,
            ));

            if ($customer_orders) {
                foreach ($customer_orders as $order) {
                    echo '<div class="order">';
                    echo '<p>Order # ' . $order->get_id() . ' - ' . wc_get_order_status_name($order->get_status()) . '</p>';
                    echo '<a href="' . $order->get_view_order_url() . '" class="button">View Order</a>';
                    echo '</div>';
                }
            } else {
                echo '<p>No recent orders.</p>';
            }
            ?>
        </div>

        <div id="profile" class="content-section" style="display: none;">
            <h3>Edit Profile</h3>
            <p>This is the profile editing section. Add your fields here.</p>
        </div>

        <div id="addresses" class="content-section" style="display: none;">
            <h3>Manage Addresses</h3>
            <p>This is the address management section. Add your fields here.</p>
        </div>
    </div>
</div>
